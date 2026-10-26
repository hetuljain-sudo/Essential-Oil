/**
 * POST /api/auth/register  { name, email, password, phone? }
 *
 * Creates an account and signs them straight in — making someone log in
 * again immediately after choosing a password is friction with no benefit.
 */

import { db } from "../_lib/db.mjs";
import { json, methodGuard } from "../_lib/http.mjs";
import {
  hashPassword, passwordProblem, newSessionToken, sessionCookie, SESSION_DAYS,
} from "../_lib/auth.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").replace(/[\s-]/g, "").replace(/^\+?91/, "") || null;
    const password = String(body.password ?? "");

    if (name.length < 2) return json(res, 400, { error: "Please give your name." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return json(res, 400, { error: "That email address doesn't look right." });
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return json(res, 400, { error: "Please give a 10-digit Indian mobile number, or leave it blank." });
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) return json(res, 400, { error: pwProblem });
    if (password.toLowerCase().includes(email.split("@")[0])) {
      return json(res, 400, { error: "Please don't use your email address as your password." });
    }

    const sql = db();
    const passwordHash = await hashPassword(password);

    // on conflict do nothing, then check: this both creates the account and
    // detects a duplicate in one statement, with no window between a "does
    // this email exist" query and the insert.
    const [customer] = await sql`
      insert into customers (email, password_hash, name, phone)
      values (${email}, ${passwordHash}, ${name}, ${phone})
      on conflict (email) do nothing
      returning id, email, name, phone`;

    if (!customer) {
      // The address is taken. Saying so is a disclosure — it confirms to a
      // stranger that this person shops here — but hiding it means silently
      // failing to create the account someone is sitting there waiting for.
      // Signup is the one place the honest message is worth more.
      return json(res, 409, {
        error: "There's already an account with that email. Try logging in instead.",
        code: "email_taken",
      });
    }

    const { token, tokenHash } = newSessionToken();
    await sql`
      insert into sessions (token_hash, customer_id, expires_at)
      values (${tokenHash}, ${customer.id}, now() + ${SESSION_DAYS + " days"}::interval)`;

    res.setHeader("set-cookie", sessionCookie(token));
    return json(res, 201, {
      customer: { email: customer.email, name: customer.name, phone: customer.phone },
    });
  } catch (err) {
    console.error("register failed:", err);
    return json(res, 500, { error: "We couldn't create that account. Please try again." });
  }
}
