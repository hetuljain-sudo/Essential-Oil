/**
 * POST /api/checkout
 *
 * Takes a cart and delivery details, decides what the order actually costs,
 * opens a Razorpay order and records ours as `created`.
 *
 * It does not take payment and it does not move stock. Both of those happen
 * when Razorpay tells us money was captured, in api/razorpay-webhook.js.
 *
 * Requires a logged-in account. The email on the order is taken from that
 * account rather than from the form: it is the address we have, and the one
 * a confirmation has to reach.
 *
 * Request:
 *   { items: [{ id, size, qty }], name, phone,
 *     address: { line1, line2?, city, state, postcode }, notes? }
 *
 * Response:
 *   { orderId, razorpayOrderId, amountPaise, keyId, summary }
 */

import { priceCart, CartError } from "./_lib/pricing.mjs";
import { db, stockMap } from "./_lib/db.mjs";
import { createOrder, keyId } from "./_lib/razorpay.mjs";
import { json, methodGuard, validateCustomer } from "./_lib/http.mjs";
import { currentCustomer } from "./_lib/auth.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});

    const sql = db();

    // Ordering requires an account. The checkout page hides itself from
    // logged-out visitors, but that is presentation; this is the rule. A
    // POST straight to this endpoint without a session gets nowhere.
    const account = await currentCustomer(sql, req);
    if (!account) {
      return json(res, 401, {
        error: "Please log in to place an order.",
        code: "login_required",
      });
    }

    const { customer, errors } = validateCustomer({ ...body, email: account.email });
    if (errors) return json(res, 400, { error: errors[0], errors });

    // Stock comes from the database, prices from the catalogue. Nothing
    // about money is taken from the request.
    const priced = priceCart(body.items, await stockMap());

    const [order] = await sql`
      insert into orders (
        customer_id,
        razorpay_order_id, subtotal_paise, shipping_paise, total_paise,
        customer_name, customer_email, customer_phone,
        address_line1, address_line2, address_city, address_state,
        address_postcode, address_country, notes
      ) values (
        ${account.id},
        ${"pending-" + crypto.randomUUID()},
        ${priced.subtotalPaise}, ${priced.shippingPaise}, ${priced.totalPaise},
        ${customer.name}, ${customer.email}, ${customer.phone},
        ${customer.address.line1}, ${customer.address.line2}, ${customer.address.city},
        ${customer.address.state}, ${customer.address.postcode}, ${customer.address.country},
        ${customer.notes}
      ) returning id`;

    // Razorpay is asked for an order only once ours exists, so a payment can
    // always be traced to a row. The placeholder id above keeps the unique
    // constraint satisfied for the moment between the two.
    let rp;
    try {
      rp = await createOrder({
        amountPaise: priced.totalPaise,
        receipt: order.id,
        notes: { order_id: order.id, email: customer.email },
      });
    } catch (err) {
      await sql`update orders set status = 'failed' where id = ${order.id}`;
      throw err;
    }

    await sql`update orders set razorpay_order_id = ${rp.id} where id = ${order.id}`;

    // Remember where this went, so the next order is prefilled. Overwrites
    // rather than keeping a list: one address covers almost everyone, and a
    // chooser is only worth building once someone asks for it.
    await sql`
      update customers
         set name = coalesce(nullif(${customer.name}, ''), name),
             phone = coalesce(nullif(${customer.phone}, ''), phone),
             address_line1 = ${customer.address.line1},
             address_line2 = ${customer.address.line2},
             address_city = ${customer.address.city},
             address_state = ${customer.address.state},
             address_postcode = ${customer.address.postcode}
       where id = ${account.id}`;

    for (const l of priced.lines) {
      await sql`
        insert into order_items (order_id, sku, product_id, name, size, qty, unit_price_paise, line_paise)
        values (${order.id}, ${l.sku}, ${l.productId}, ${l.name}, ${l.size},
                ${l.qty}, ${l.unitPricePaise}, ${l.linePaise})`;
    }

    return json(res, 200, {
      orderId: order.id,
      razorpayOrderId: rp.id,
      amountPaise: priced.totalPaise,
      keyId: keyId(),
      summary: {
        subtotalPaise: priced.subtotalPaise,
        shippingPaise: priced.shippingPaise,
        totalPaise: priced.totalPaise,
        lines: priced.lines.map(({ name, size, qty, linePaise }) => ({ name, size, qty, linePaise })),
      },
    });
  } catch (err) {
    if (err instanceof CartError) return json(res, 400, { error: err.message, code: err.code });

    // Anything else is ours. Log it in full, tell the shopper nothing that
    // describes our internals.
    console.error("checkout failed:", err);
    return json(res, 500, { error: "We couldn't start that order. Please try again." });
  }
}
