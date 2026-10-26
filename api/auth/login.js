/**
 * POST /api/auth/login  { email, password }
 *
 * One failure message for every reason, and a hash computed even when no
 * such account exists — see below. Both exist so that this endpoint cannot
 * be used to find out who has an account here.
 */

import { db } from "../_lib/db.mjs";
import { json, methodGuard } from "../_lib/http.mjs";
import {
  verifyPassword, hashPassword, newSessionToken, sessionCookie, SESSION_DAYS,
} from "../_lib/auth.mjs";

const MAX_FAILURES = 10;
const LOCK_MINUTES = 15;

/** Said for a wrong password, an unknown email, and anything else. */
const GENERIC = "Email or password is incorrect.";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) return json(res, 400, { error: GENERIC });

    const sql = db();
    const [customer] = await sql`
      select id, email, name, phone, password_hash, failed_logins, locked_until
        from customers where email = ${email}`;

    if (!customer) {
      // Hash something anyway. Without this, a missing account answers in a
      // millisecond and a real one takes a hundred, and the difference is a
      // list of our customers' email addresses.
      await hashPassword(password);
      return json(res, 401, { error: GENERIC });
    }

    if (customer.locked_until && new Date(customer.locked_until) > new Date()) {
      return json(res, 429, {
        error: `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`,
        code: "locked",
      });
    }

    if (!await verifyPassword(password, customer.password_hash)) {
      const failures = customer.failed_logins + 1;
      await sql`
        update customers
           set failed_logins = ${failures},
               locked_until = ${failures >= MAX_FAILURES
                 ? sql`now() + ${LOCK_MINUTES + " minutes"}::interval`
                 : null}
         where id = ${customer.id}`;
      return json(res, 401, { error: GENERIC });
    }

    await sql`
      update customers
         set failed_logins = 0, locked_until = null, last_login_at = now()
       where id = ${customer.id}`;

    const { token, tokenHash } = newSessionToken();
    await sql`
      insert into sessions (token_hash, customer_id, expires_at)
      values (${tokenHash}, ${customer.id}, now() + ${SESSION_DAYS + " days"}::interval)`;

    // Housekeeping: expired rows for this customer are dead weight and there
    // is no cron to sweep them.
    await sql`delete from sessions where customer_id = ${customer.id} and expires_at < now()`;

    res.setHeader("set-cookie", sessionCookie(token));
    return json(res, 200, {
      customer: { email: customer.email, name: customer.name, phone: customer.phone },
    });
  } catch (err) {
    console.error("login failed:", err);
    return json(res, 500, { error: "We couldn't sign you in. Please try again." });
  }
}
