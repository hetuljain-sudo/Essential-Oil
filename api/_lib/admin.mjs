/**
 * The admin gate, and the small amount of validation the admin endpoints share.
 *
 * Every admin endpoint calls requireAdmin first. Not one of them trusts the
 * page: /admin/ hides itself from everyone else, but hiding a page is
 * decoration. A direct POST is the case that matters.
 */

import { db } from "./db.mjs";
import { readCookie, sha256, SESSION_COOKIE } from "./auth.mjs";
import { json } from "./http.mjs";

// Re-exported so endpoints keep importing their validation from one place,
// while the validators themselves stay free of the database.
export { parseQuantity, parseTracking, parseResolution } from "./validate.mjs";

/**
 * The signed-in admin, or null.
 *
 * Deliberately a second query rather than a flag on currentCustomer: the
 * admin check should read the database at the moment it is needed, so
 * revoking the flag takes effect on the next request rather than whenever
 * the session happens to expire.
 */
export async function currentAdmin(sql, req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;

  const [row] = await sql`
    select c.id, c.email, c.name
      from sessions s
      join customers c on c.id = s.customer_id
     where s.token_hash = ${sha256(token)}
       and s.expires_at > now()
       and c.is_admin = true`;

  return row ?? null;
}

/**
 * Guard an admin endpoint. Returns the sql handle and the admin, or null
 * after having already answered.
 *
 * A signed-in non-admin gets the same 404 as a stranger. A 403 would confirm
 * that /api/admin/* exists and is worth attacking; a 404 says only that
 * there is nothing here.
 */
export async function requireAdmin(req, res) {
  const sql = db();
  const admin = await currentAdmin(sql, req);

  if (!admin) {
    json(res, 404, { error: "Not found." });
    return null;
  }
  return { sql, admin };
}

/**
 * The end of every admin handler's catch.
 *
 * One failure here is the reader's to fix and the rest are ours, and the
 * difference is worth drawing. Postgres answers 42P01 for a table that does
 * not exist and 42703 for a column that does not — both mean db/schema.sql
 * has gained something since it was last applied, which is one command away
 * from fixed.
 *
 * This existed as a generic "Something went wrong", and the cost was real:
 * adding discount_codes put two columns in the orders query, and an admin
 * opening the page against the old database was told nothing at all — the
 * whole panel sat behind a message that read as "you are not an admin".
 *
 * Everything else stays deliberately vague. An admin is still a visitor,
 * and a stack trace in a response body is a gift to whoever finds it.
 */
export function adminFailed(res, err, label) {
  console.error(`${label} failed:`, err);

  if (err?.code === "42P01" || err?.code === "42703") {
    return json(res, 503, {
      error: "The database is behind this version of the site. Run `npm run db:setup`.",
    });
  }
  return json(res, 500, { error: "Something went wrong." });
}
