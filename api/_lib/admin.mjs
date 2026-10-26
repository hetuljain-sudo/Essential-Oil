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

/** A quantity an admin typed. Must be a sane whole number of bottles. */
export function parseQuantity(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { error: "Quantity must be a whole number." };
  }
  if (value < 0) return { error: "Quantity cannot be negative." };
  // Not a real limit, a typo guard: 100000 is a slipped keystroke, not stock.
  if (value > 10000) return { error: "That looks like a typo — 10,000 is the most we'll accept." };
  return { quantity: value };
}

/** A tracking reference, or nothing. Stored as typed, trimmed. */
export function parseTracking(value) {
  if (value == null || value === "") return { tracking: null };
  if (typeof value !== "string") return { error: "Tracking must be text." };
  const tracking = value.trim();
  if (tracking.length > 120) return { error: "That tracking reference is too long." };
  return { tracking: tracking || null };
}
