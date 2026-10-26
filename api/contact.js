/**
 * POST /api/contact  { name, email, subject?, message, website? }
 *
 * Stores what someone wrote. Until there is an email sender, that is the
 * whole job — and it is already more than the form did before, which was to
 * say "we'll be in touch" and discard the message.
 *
 * Read them with:
 *   select * from messages where handled_at is null order by created_at;
 */

import { db } from "./_lib/db.mjs";
import { json, methodGuard } from "./_lib/http.mjs";
import { currentCustomer } from "./_lib/auth.mjs";

const str = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});

    // Honeypot. The field is hidden from people and left empty by them; bots
    // fill in everything they find. Answer 200 so the bot believes it worked
    // and does not come back with a different approach.
    if (str(body.website)) return json(res, 200, { ok: true });

    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const subject = str(body.subject).slice(0, 200) || null;
    const message = str(body.message);

    if (name.length < 2) return json(res, 400, { error: "Please give your name." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return json(res, 400, { error: "That email address doesn't look right." });
    }
    if (message.length < 10) {
      return json(res, 400, { error: "Please say a little more so we can help." });
    }
    if (message.length > 5000) {
      return json(res, 400, { error: "That message is too long — please trim it a little." });
    }

    const sql = db();
    const account = await currentCustomer(sql, req).catch(() => null);

    // A crude flood guard: five messages from one address in an hour is
    // someone testing the form, not someone who needs help five times.
    const [{ recent }] = await sql`
      select count(*)::int as recent from messages
       where email = ${email} and created_at > now() - interval '1 hour'`;
    if (recent >= 5) {
      return json(res, 429, { error: "We've got your messages — give us a little time to reply." });
    }

    await sql`
      insert into messages (name, email, subject, body, customer_id)
      values (${name}, ${email}, ${subject}, ${message}, ${account?.id ?? null})`;

    return json(res, 201, { ok: true });
  } catch (err) {
    console.error("contact failed:", err);
    return json(res, 500, { error: "We couldn't send that just now. Please try again." });
  }
}
