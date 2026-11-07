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
 *     address: { line1, line2?, city, state, postcode }, notes?, code? }
 *
 * Response:
 *   { orderId, razorpayOrderId, amountPaise, keyId, summary }
 *
 * With `{ preview: true }` it prices the cart and stops: no order row, no
 * Razorpay call, no address saved — just the summary, so the checkout page
 * can show what a discount code is worth before anyone commits to paying.
 *
 * The preview lives in this handler rather than its own file for the reason
 * recorded in api/admin/orders.js: Vercel's Hobby plan caps the deployment at
 * twelve functions and this project is at twelve. It earns its place anyway —
 * the quote a shopper is shown and the amount they are charged now come from
 * one path through one piece of code, so the two cannot disagree.
 */

import { priceCart, CartError } from "./_lib/pricing.mjs";
import { db, stockMap } from "./_lib/db.mjs";
import { createOrder, keyId } from "./_lib/razorpay.mjs";
import { json, methodGuard, validateCustomer } from "./_lib/http.mjs";
import { currentCustomer } from "./_lib/auth.mjs";
import { readCode, applyDiscount, DiscountError } from "../src/discount.mjs";

/**
 * The cart, priced, with any code applied.
 *
 * Returns the same shape whether this is a preview or the real thing, which
 * is the point: `priced` here is what gets written to the order row and sent
 * to Razorpay, and it is also what the page was shown a moment earlier.
 */
async function quote(sql, items, rawCode) {
  // Stock from the database, prices from the catalogue. Nothing about money
  // is taken from the request.
  const priced = priceCart(items, await stockMap());

  if (rawCode == null || rawCode === "") {
    return { ...priced, discountPaise: 0, code: null };
  }

  const { code, error } = readCode(rawCode);
  if (error) throw new DiscountError(error);

  // Looked up by the normalised spelling, which is also how it is stored.
  const [def] = await sql`
    select code, kind, value, min_subtotal_paise, max_redemptions,
           times_redeemed, expires_at, active
      from discount_codes where code = ${code}`;

  const applied = applyDiscount(priced, def ?? null);
  return { ...priced, discountPaise: applied.discountPaise, totalPaise: applied.totalPaise, code: applied.code };
}

const summaryOf = (priced) => ({
  subtotalPaise: priced.subtotalPaise,
  shippingPaise: priced.shippingPaise,
  discountPaise: priced.discountPaise,
  code: priced.code,
  totalPaise: priced.totalPaise,
  lines: priced.lines.map(({ name, size, qty, linePaise }) => ({ name, size, qty, linePaise })),
});

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

    /*
     * A preview answers before the address is validated, deliberately. The
     * shopper is trying a code at the top of a form they have not finished,
     * and refusing to quote until the PIN code is filled in would be the
     * site arguing with somebody who is trying to give it money.
     */
    if (body.preview === true) {
      return json(res, 200, { summary: summaryOf(await quote(sql, body.items, body.code)) });
    }

    const { customer, errors } = validateCustomer({ ...body, email: account.email });
    if (errors) return json(res, 400, { error: errors[0], errors });

    const priced = await quote(sql, body.items, body.code);

    const [order] = await sql`
      insert into orders (
        customer_id,
        razorpay_order_id, subtotal_paise, shipping_paise, total_paise,
        discount_code, discount_paise,
        customer_name, customer_email, customer_phone,
        address_line1, address_line2, address_city, address_state,
        address_postcode, address_country, notes
      ) values (
        ${account.id},
        ${"pending-" + crypto.randomUUID()},
        ${priced.subtotalPaise}, ${priced.shippingPaise}, ${priced.totalPaise},
        ${priced.code}, ${priced.discountPaise},
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
      summary: summaryOf(priced),
    });
  } catch (err) {
    if (err instanceof CartError) return json(res, 400, { error: err.message, code: err.code });
    // Same treatment: a fault in what was sent, phrased for the shopper.
    if (err instanceof DiscountError) return json(res, 400, { error: err.message, code: err.code });

    // Anything else is ours. Log it in full, tell the shopper nothing that
    // describes our internals.
    console.error("checkout failed:", err);
    return json(res, 500, { error: "We couldn't start that order. Please try again." });
  }
}
