/**
 * POST /api/newsletter  { email, source?, website? }
 *
 * Records an address. It does not send anything, because nothing can send
 * anything yet — which is exactly why the reply this returns is careful not
 * to promise an email.
 *
 * Every subscriber gets an unsubscribe token on the way in. Building the
 * list first and the way out later is how lists end up with no way out.
 */

import { randomBytes } from "node:crypto";
import { db } from "./_lib/db.mjs";
import { json, methodGuard } from "./_lib/http.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});

    if (typeof body.website === "string" && body.website.trim()) {
      return json(res, 200, { ok: true }); // honeypot
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return json(res, 400, { error: "That email address doesn't look right." });
    }

    const source = String(body.source ?? "").trim().slice(0, 60) || null;

    // Subscribing twice is not an error, and saying "you are already on the
    // list" would tell a stranger who subscribes here. It also un-does an
    // earlier unsubscribe, which is what someone signing up again means.
    await db()`
      insert into subscribers (email, unsubscribe_token, source)
      values (${email}, ${randomBytes(24).toString("base64url")}, ${source})
      on conflict (email) do update set unsubscribed_at = null`;

    return json(res, 201, { ok: true });
  } catch (err) {
    console.error("newsletter failed:", err);
    return json(res, 500, { error: "We couldn't add you just now. Please try again." });
  }
}
