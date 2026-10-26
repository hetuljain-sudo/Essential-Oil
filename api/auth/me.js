/**
 * GET /api/auth/me
 *
 * Who is signed in, and what they have ordered. The account page asks on
 * load; everything it shows comes from here.
 *
 * Returns 200 with `customer: null` rather than 401 when nobody is signed in.
 * Not being logged in is a normal state of the world, not an error.
 */

import { db } from "../_lib/db.mjs";
import { json, methodGuard } from "../_lib/http.mjs";
import { currentCustomer } from "../_lib/auth.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "GET")) return;

  try {
    const sql = db();
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
         and o.status in ('paid', 'oversold')
       group by o.id
       order by o.created_at desc
       limit 50`;

    return json(res, 200, {
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      orders,
    });
  } catch (err) {
    console.error("me failed:", err);
    return json(res, 500, { error: "Couldn't load your account." });
  }
}
