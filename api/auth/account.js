/**
 * POST /api/auth/account  { action: "profile", name, phone? }
 *                         { action: "address", line1, line2?, city, state, postcode }
 *                         { action: "password", current, next }
 *
 * Changing your own details. Until this existed there was no way at all: a
 * customer who mistyped their name, moved house, or wanted a different
 * password had to ask us to edit the database.
 *
 * One endpoint with an action, the way /api/admin/orders carries ship,
 * thank, resolve and sync — not because that is prettier than three files,
 * but because files under api/ are a capped resource on this host and three
 * of them for one page would spend the room that password reset needs.
 *
 * ---
 *
 * **Changing the email address is deliberately absent.**
 *
 * Doing it safely means sending a confirmation to the new address before
 * switching, so that a typo does not lock someone out of their own account
 * and an attacker who borrows a session cannot quietly take it over. That
 * needs email, which this shop does not have configured yet. Doing it
 * unsafely would be worse than not doing it, so it waits.
 */

import { db } from "../_lib/db.mjs";
import { json, methodGuard, validateCustomer } from "../_lib/http.mjs";
import {
  currentCustomer, verifyPassword, hashPassword, passwordProblem,
  readCookie, sha256, SESSION_COOKIE,
} from "../_lib/auth.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const sql = db();

    const account = await currentCustomer(sql, req);
    if (!account) {
      return json(res, 401, { error: "Please log in first.", code: "login_required" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
    const { action } = body;

    if (action === "profile") return await saveProfile(sql, account, body, res);
    if (action === "address") return await saveAddress(sql, account, body, res);
    if (action === "password") return await changePassword(sql, account, body, req, res);

    return json(res, 400, { error: "Unknown action." });
  } catch (err) {
    console.error("account update failed:", err);
    return json(res, 500, { error: "We couldn't save that. Please try again." });
  }
}

/* ------------------------------------------------------------- profile */

async function saveProfile(sql, account, body, res) {
  const name = String(body.name ?? "").trim();
  // Same normalising as registration: spaces, hyphens and a +91 stripped,
  // so the same number typed two ways is stored one way.
  const phone = String(body.phone ?? "").replace(/[\s-]/g, "").replace(/^\+?91/, "") || null;

  if (name.length < 2) return json(res, 400, { error: "Please give your name." });
  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    return json(res, 400, { error: "Please give a 10-digit Indian mobile number, or leave it blank." });
  }

  const [row] = await sql`
    update customers set name = ${name}, phone = ${phone}
     where id = ${account.id}
     returning name, phone`;

  return json(res, 200, { ok: true, customer: { name: row.name, phone: row.phone } });
}

/* ------------------------------------------------------------- address */

async function saveAddress(sql, account, body, res) {
  // Reuses the checkout validator, so an address saved here is one the
  // checkout would also accept. Two sets of rules would mean an address you
  // can save and then cannot order with.
  const { customer, errors } = validateCustomer({
    name: account.name,
    email: account.email,
    // The validator insists on a phone; the account already has one, and the
    // address form has no business asking for it again.
    phone: body.phone ?? account.phone ?? "9000000000",
    address: body,
  });

  if (errors) {
    // Drop any complaint about the phone — it is not on this form, so
    // reporting it would send someone looking for a field that is not there.
    const real = errors.filter((e) => !/mobile number/i.test(e));
    if (real.length) return json(res, 400, { error: real[0], errors: real });
  }

  const a = customer?.address ?? {};
  const [row] = await sql`
    update customers
       set address_line1 = ${a.line1}, address_line2 = ${a.line2},
           address_city = ${a.city}, address_state = ${a.state},
           address_postcode = ${a.postcode}
     where id = ${account.id}
     returning address_line1, address_line2, address_city, address_state, address_postcode`;

  return json(res, 200, {
    ok: true,
    address: {
      line1: row.address_line1, line2: row.address_line2, city: row.address_city,
      state: row.address_state, postcode: row.address_postcode,
    },
  });
}

/* ------------------------------------------------------------ password */

/**
 * Change the password, and end every other session.
 *
 * The current password is required even though the request already carries
 * a valid session. A borrowed laptop with a logged-in browser should not be
 * enough to take an account over, and asking for it costs one field.
 *
 * Ending the other sessions is the point as much as the new password is: if
 * someone is changing it because they think it was compromised, leaving the
 * attacker's session alive defeats the whole exercise. The current browser
 * keeps its session, because being logged out by your own password change
 * reads as a failure.
 */
async function changePassword(sql, account, body, req, res) {
  const current = String(body.current ?? "");
  const next = String(body.next ?? "");

  const [row] = await sql`select password_hash from customers where id = ${account.id}`;
  if (!row || !await verifyPassword(current, row.password_hash)) {
    return json(res, 403, { error: "That current password isn't right." });
  }

  const problem = passwordProblem(next);
  if (problem) return json(res, 400, { error: problem });

  if (next === current) {
    return json(res, 400, { error: "That's the password you already have." });
  }
  if (next.toLowerCase().includes(account.email.split("@")[0])) {
    return json(res, 400, { error: "Please don't use your email address as your password." });
  }

  await sql`
    update customers
       set password_hash = ${await hashPassword(next)},
           failed_logins = 0, locked_until = null
     where id = ${account.id}`;

  // Every session except this browser's.
  const keep = sha256(readCookie(req, SESSION_COOKIE) ?? "");
  const ended = await sql`
    delete from sessions
     where customer_id = ${account.id} and token_hash <> ${keep}
     returning token_hash`;

  return json(res, 200, {
    ok: true,
    // Said back, because "and you have been signed out everywhere else" is
    // the reassuring half of changing a password you think was stolen.
    otherSessionsEnded: ended.length,
  });
}
