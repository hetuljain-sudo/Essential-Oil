/**
 * POST /api/auth/recover  { action: "request", email }
 *                         { action: "reset", token, password }
 *
 * Getting back in without the password.
 *
 * Two actions in one file because files under api/ are capped at twelve on
 * this host, and this is the twelfth. Not a design preference; a constraint
 * worth stating so the next person does not "tidy" it into two and break the
 * deploy.
 *
 * ---
 *
 * **What this is careful about, and why.**
 *
 * A reset token *is* the account for as long as it lives, so it gets the
 * same treatment as a session token: 32 random bytes, and only its SHA-256
 * stored. A copy of the table is useless for breaking in.
 *
 * The request step answers identically whether or not the address has an
 * account. Anything else turns this endpoint into a way of asking "does this
 * person shop here", which is exactly what the login endpoint already goes
 * to some trouble to avoid.
 *
 * A successful reset **ends every session** for that customer. Someone
 * resetting a password usually cannot get in, and sometimes that is because
 * somebody else can. Leaving the other sessions alive would hand the
 * account back to them.
 */

import { randomBytes } from "node:crypto";

import { db } from "../_lib/db.mjs";
import { json, methodGuard } from "../_lib/http.mjs";
import {
  hashPassword, passwordProblem, sha256,
  newSessionToken, sessionCookie, SESSION_DAYS,
} from "../_lib/auth.mjs";
import { sendEmail, emailStatus } from "../_lib/email.mjs";
import { resetEmail } from "../../src/emails.mjs";

/** How long a link lives. Long enough to find the email, short enough to matter. */
const MINUTES = 60;

/** Requests per address per hour, so this cannot be used to flood an inbox. */
const MAX_REQUESTS_PER_HOUR = 3;

/**
 * Said to everyone who asks, whatever the answer.
 *
 * "If" is doing real work in that sentence: it is true when the address has
 * an account and true when it does not.
 */
const SENT = "If that address has an account, a reset link is on its way.";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const sql = db();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});

    if (body.action === "request") return await requestReset(sql, body, req, res);
    if (body.action === "reset") return await applyReset(sql, body, res);

    return json(res, 400, { error: "Unknown action." });
  } catch (err) {
    console.error("password recovery failed:", err);
    return json(res, 500, { error: "Something went wrong. Please try again." });
  }
}

/* --------------------------------------------------------- ask for a link */

async function requestReset(sql, body, req, res) {
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return json(res, 400, { error: "That email address doesn't look right." });
  }

  /*
   * Refuse up front when there is no way to send.
   *
   * This is a fact about the shop, not about the address, so saying it
   * reveals nothing — and the alternative is answering "a link is on its
   * way" to someone who will wait for an email that was never sent. Of the
   * two, a visitor who is told to get in touch is far better off.
   */
  const mail = emailStatus();
  if (!mail.configured) {
    console.error(`password reset requested but email is not configured: ${mail.reason}`);
    return json(res, 503, {
      error: "Password reset isn't available yet. Please use the contact form and we'll help.",
      code: "email_unavailable",
    });
  }

  const [customer] = await sql`select id, email, name from customers where email = ${email}`;

  // No account: say the same thing, do nothing, and do not spend the time a
  // real one would take — there is no hash to compute here, so the timing
  // difference is small and not worth padding with a fake one.
  if (!customer) return json(res, 200, { ok: true, message: SENT });

  const [{ recent }] = await sql`
    select count(*)::int as recent from password_resets
     where customer_id = ${customer.id} and created_at > now() - interval '1 hour'`;

  if (recent >= MAX_REQUESTS_PER_HOUR) {
    // Still the same message. Someone hammering the form learns nothing, and
    // the person whose inbox it is has already had three.
    console.warn(`password reset throttled for customer ${customer.id}`);
    return json(res, 200, { ok: true, message: SENT });
  }

  const token = randomBytes(32).toString("base64url");

  await sql`
    insert into password_resets (token_hash, customer_id, expires_at, requested_ip)
    values (${sha256(token)}, ${customer.id},
            now() + (${MINUTES}::int * interval '1 minute'),
            ${req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ?? null})`;

  const base = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
  const url = `${base}/account/reset/?token=${encodeURIComponent(token)}`;

  const { subject, text } = resetEmail({ name: customer.name, url, minutes: MINUTES });
  const sent = await sendEmail({ to: customer.email, toName: customer.name, subject, text });

  if (!sent.sent) {
    // The token is already stored and will expire on its own. Burn it now
    // rather than leave a live token nobody can use — it costs nothing and
    // keeps the table meaning what it says.
    await sql`delete from password_resets where token_hash = ${sha256(token)}`;
    console.error(`reset link for ${customer.id} not sent: ${sent.reason}`);
    return json(res, 502, {
      error: "We couldn't send that just now. Please try again shortly.",
    });
  }

  return json(res, 200, { ok: true, message: SENT });
}

/* ------------------------------------------------------------ use a link */

async function applyReset(sql, body, res) {
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  // One message for expired, used, and never-existed. They are different to
  // us and identical to the person holding a link that does not work, and
  // distinguishing them would say whether a token was ever real.
  const DEAD = "That link has expired or has already been used. Please ask for a new one.";

  if (!token) return json(res, 400, { error: DEAD });

  const problem = passwordProblem(password);
  if (problem) return json(res, 400, { error: problem });

  /*
   * Claim the token with a conditional update, so two clicks on the same
   * link cannot both proceed. Whoever wins gets the row; the loser is told
   * the link is spent, which by then it is.
   */
  const [claimed] = await sql`
    update password_resets
       set used_at = now()
     where token_hash = ${sha256(token)}
       and used_at is null
       and expires_at > now()
     returning customer_id`;

  if (!claimed) return json(res, 400, { error: DEAD });

  const [customer] = await sql`
    select id, email, name, phone from customers where id = ${claimed.customer_id}`;

  if (!customer) return json(res, 400, { error: DEAD });

  if (password.toLowerCase().includes(customer.email.split("@")[0])) {
    // The token is spent either way: a rejected password should not hand
    // back a reusable link, and asking for a new one costs one click.
    return json(res, 400, { error: "Please don't use your email address as your password." });
  }

  await sql`
    update customers
       set password_hash = ${await hashPassword(password)},
           failed_logins = 0, locked_until = null
     where id = ${customer.id}`;

  // Every session, including any the person who locked them out might hold.
  const ended = await sql`
    delete from sessions where customer_id = ${customer.id} returning token_hash`;

  // Any other outstanding links for this account die with it.
  await sql`
    update password_resets set used_at = now()
     where customer_id = ${customer.id} and used_at is null`;

  // Sign them in, because the alternative is a login form immediately after
  // proving they own the address.
  const { token: session, tokenHash } = newSessionToken();
  await sql`
    insert into sessions (token_hash, customer_id, expires_at)
    values (${tokenHash}, ${customer.id}, now() + ${SESSION_DAYS + " days"}::interval)`;

  res.setHeader("set-cookie", sessionCookie(session));

  return json(res, 200, {
    ok: true,
    sessionsEnded: ended.length,
    customer: { name: customer.name, email: customer.email, phone: customer.phone },
  });
}
