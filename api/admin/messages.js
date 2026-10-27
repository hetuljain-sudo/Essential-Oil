/**
 * GET  /api/admin/messages          contact messages, unhandled first
 * POST /api/admin/messages  { id, handled: true | false }
 *
 * Until something sends email, this page is the only way anyone knows a
 * message arrived.
 */

import { json } from "../_lib/http.mjs";
import { requireAdmin } from "../_lib/admin.mjs";

export default async function handler(req, res) {
  const gate = await requireAdmin(req, res);
  if (!gate) return;
  const { sql } = gate;

  try {
    if (req.method === "GET") {
      const messages = await sql`
        select id, name, email, subject, body, handled_at, created_at,
               customer_id is not null as from_account
          from messages
         order by handled_at nulls first, created_at desc
         limit 100`;

      const [counts] = await sql`
        select count(*) filter (where handled_at is null)::int as unhandled,
               (select count(*) from subscribers where unsubscribed_at is null)::int as subscribers
          from messages`;

      return json(res, 200, { messages, counts });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
      const { id, handled } = body;

      if (typeof id !== "string" || !id) return json(res, 400, { error: "Which message?" });
      if (typeof handled !== "boolean") return json(res, 400, { error: "Handled must be true or false." });

      // Reversible on purpose: marking the wrong row done should cost a click
      // to undo, not a trip to the database.
      // `case when` rather than a nested sql`now()`: the driver sends an
      // interpolated template as a bound value, not as SQL, so marking a
      // message handled used to send an object where a timestamp belonged
      // and answer 500. Un-marking worked, because that branch was a plain
      // null.
      const [row] = await sql`
        update messages
           set handled_at = case when ${handled}::boolean then now() else null end
         where id = ${id}
         returning id`;

      if (!row) return json(res, 404, { error: "No such message." });
      return json(res, 200, { ok: true });
    }

    res.setHeader("allow", "GET, POST");
    return json(res, 405, { error: "Use GET or POST." });
  } catch (err) {
    console.error("admin messages failed:", err);
    return json(res, 500, { error: "Something went wrong." });
  }
}
