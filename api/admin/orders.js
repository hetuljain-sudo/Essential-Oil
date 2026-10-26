/**
 * GET  /api/admin/orders            recent orders, newest first
 * POST /api/admin/orders  { id, action: "ship", tracking? }
 *
 * The working list: what has been paid for and not yet sent.
 */

import { json } from "../_lib/http.mjs";
import { requireAdmin, parseTracking } from "../_lib/admin.mjs";

export default async function handler(req, res) {
  const gate = await requireAdmin(req, res);
  if (!gate) return;
  const { sql } = gate;

  try {
    if (req.method === "GET") {
      const orders = await sql`
        select o.id, o.status, o.total_paise, o.shipping_paise, o.created_at,
               o.paid_at, o.shipped_at, o.tracking,
               o.customer_name, o.customer_email, o.customer_phone,
               o.address_line1, o.address_line2, o.address_city,
               o.address_state, o.address_postcode, o.notes,
               coalesce(
                 json_agg(json_build_object(
                   'name', i.name, 'size', i.size, 'qty', i.qty,
                   'linePaise', i.line_paise
                 ) order by i.id) filter (where i.id is not null),
                 '[]'
               ) as items
          from orders o
          left join order_items i on i.order_id = o.id
         group by o.id
         order by
           -- Paid and unshipped first: that is the actual to-do list.
           case o.status when 'oversold' then 0 when 'paid' then 1 else 2 end,
           o.created_at desc
         limit 100`;

      const [counts] = await sql`
        select count(*) filter (where status = 'paid')::int as to_ship,
               count(*) filter (where status = 'oversold')::int as oversold,
               coalesce(sum(total_paise) filter (where status in ('paid','shipped')), 0)::bigint as taken_paise
          from orders`;

      return json(res, 200, { orders, counts });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
      const { id, action } = body;

      if (typeof id !== "string" || !id) return json(res, 400, { error: "Which order?" });
      if (action !== "ship") return json(res, 400, { error: "Unknown action." });

      const { tracking, error } = parseTracking(body.tracking);
      if (error) return json(res, 400, { error });

      // Only a paid order can ship. Guarding in the statement means two
      // clicks cannot double-ship, and an unpaid order cannot be marked sent
      // by someone guessing an id.
      const [order] = await sql`
        update orders
           set status = 'shipped', shipped_at = now(), tracking = ${tracking}
         where id = ${id} and status = 'paid'
         returning id, customer_email`;

      if (!order) {
        return json(res, 409, { error: "That order isn't awaiting dispatch — reload the page." });
      }

      // Nobody is told. Worth saying out loud until email exists.
      console.log(`order ${order.id} marked shipped; no email sent to ${order.customer_email}`);

      return json(res, 200, { ok: true });
    }

    res.setHeader("allow", "GET, POST");
    return json(res, 405, { error: "Use GET or POST." });
  } catch (err) {
    console.error("admin orders failed:", err);
    return json(res, 500, { error: "Something went wrong." });
  }
}
