/**
 * POST /api/auth/logout
 *
 * Deletes the session server-side as well as clearing the cookie. Clearing
 * only the cookie would leave a token that still works for anyone who copied
 * it, which is the opposite of what someone pressing "log out" is asking for.
 */

import { db } from "../_lib/db.mjs";
import { json, methodGuard } from "../_lib/http.mjs";
import { readCookie, sha256, clearedCookie, SESSION_COOKIE } from "../_lib/auth.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    try {
      await db()`delete from sessions where token_hash = ${sha256(token)}`;
    } catch (err) {
      // Still clear the cookie: from the person's side, logging out must
      // never appear to fail.
      console.error("logout cleanup failed:", err);
    }
  }

  res.setHeader("set-cookie", clearedCookie());
  return json(res, 200, { ok: true });
}
