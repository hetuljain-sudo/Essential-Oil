/**
 * The session: who is signed in, signing in, signing out.
 *
 *   GET    /api/auth/session   who am I, and what have I ordered
 *   POST   /api/auth/session   { email, password }  — sign in
 *   DELETE /api/auth/session   — sign out
 *
 * One file because it is one thing. It was three — login.js, logout.js,
 * me.js — each a handful of lines around the same cookie and the same table.
 *
 * The practical reason for merging them: Vercel's Hobby plan caps Serverless
 * Functions per deployment and every file under api/ is one. This project
 * sat at exactly twelve and could not add an endpoint at all. Three files
 * doing one job were the obvious place to find room.
 *
 * The method is the verb. A session is a resource: GET reads it, POST
 * creates one, DELETE ends it. No `action` field, because HTTP already has
 * the word.
 */

import { db } from "../_lib/db.mjs";
import { json } from "../_lib/http.mjs";
import {
  verifyPassword, hashPassword, newSessionToken, sessionCookie, clearedCookie,
  currentCustomer, readCookie, sha256, SESSION_COOKIE, SESSION_DAYS,
} from "../_lib/auth.mjs";

const MAX_FAILURES = 10;
const LOCK_MINUTES = 15;

/** Said for a wrong password, an unknown email, and anything else. */
const GENERIC = "Email or password is incorrect.";

export default async function handler(req, res) {
  const sql = db();

  try {
    if (req.method === "GET") return await whoAmI(sql, req, res);
    if (req.method === "POST") return await signIn(sql, req, res);
    if (req.method === "DELETE") return await signOut(sql, req, res);

    res.setHeader("allow", "GET, POST, DELETE");
    return json(res, 405, { error: "Use GET, POST or DELETE." });
  } catch (err) {
    console.error(`session ${req.method} failed:`, err);
    return json(res, 500, { error: "Something went wrong. Please try again." });
  }
}

/* ------------------------------------------------------------- GET: me */

/**
 * Returns 200 with `customer: null` rather than 401 when nobody is signed
 * in. Not being logged in is a normal state of the world, not an error.
 */
async function whoAmI(sql, req, res) {
  const customer = await currentCustomer(sql, req);
  if (!customer) return json(res, 200, { customer: null, orders: [] });

  // Scoped to this customer in the query itself. An order id in the URL is
  // never what decides whose order gets returned.
  const orders = await sql`
    select o.id, o.status, o.total_paise, o.created_at,
           coalesce(
             json_agg(json_build_object('name', i.name, 'size', i.size, 'qty', i.qty)
                      order by i.id)
             filter (where i.id is not null),
             '[]'
           ) as items
      from orders o
      left join order_items i on i.order_id = o.id
     where o.customer_id = ${customer.id}
       and o.status in ('paid', 'oversold', 'shipped')
     group by o.id
     order by o.created_at desc
     limit 50`;

  // The saved delivery address, for prefilling checkout. Not held in
  // currentCustomer, which runs on every authenticated request and has no
  // use for it.
  const [saved] = await sql`
    select address_line1, address_line2, address_city, address_state, address_postcode
      from customers where id = ${customer.id}`;

  return json(res, 200, {
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: saved?.address_line1
        ? {
            line1: saved.address_line1,
            line2: saved.address_line2,
            city: saved.address_city,
            state: saved.address_state,
            postcode: saved.address_postcode,
          }
        : null,
    },
    orders,
  });
}

/* --------------------------------------------------------- POST: log in */

/**
 * One failure message for every reason, and a hash computed even when no
 * such account exists. Both exist so this cannot be used to find out who
 * has an account here.
 */
async function signIn(sql, req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) return json(res, 400, { error: GENERIC });

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
    // The lock time is computed by Postgres, not here, so a clock skew
    // between the function and the database cannot shorten a lockout.
    //
    // Expressed as `case when ... end` rather than by interpolating a nested
    // sql`` fragment. A nested template is not a fragment: the driver passes
    // it as a bound *value*, so the statement became `locked_until = $1`
    // with an object for $1 and threw — the tenth wrong password answered
    // 500, never wrote the lock, and left the account guessable without
    // limit.
    const lockMinutes = failures >= MAX_FAILURES ? LOCK_MINUTES : null;
    await sql`
      update customers
         set failed_logins = ${failures},
             locked_until = case
               when ${lockMinutes}::int is null then null
               else now() + (${lockMinutes}::int * interval '1 minute')
             end
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
}

/* ------------------------------------------------------ DELETE: log out */

/**
 * Deletes the session server-side as well as clearing the cookie. Clearing
 * only the cookie would leave a token that still works for anyone who copied
 * it, which is the opposite of what someone pressing "log out" is asking for.
 */
async function signOut(sql, req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    try {
      await sql`delete from sessions where token_hash = ${sha256(token)}`;
    } catch (err) {
      // Still clear the cookie: from the person's side, logging out must
      // never appear to fail.
      console.error("logout cleanup failed:", err);
    }
  }

  res.setHeader("set-cookie", clearedCookie());
  return json(res, 200, { ok: true });
}
