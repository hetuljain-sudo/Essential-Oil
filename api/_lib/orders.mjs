/**
 * What happens to an order once money has moved.
 *
 * Lifted out of api/razorpay-webhook.js unchanged. The webhook's job is to
 * prove a message came from Razorpay; this file's job is what we then do
 * about it, and the two are worth separating because only the first needs a
 * signature and only the second can be exercised without Razorpay at all.
 *
 * That separation is the point: db/smoke.mjs calls markPaid directly against
 * a real database, which is how the redelivery guard and the oversold path
 * get executed without a payment gateway in the room.
 */

/**
 * Settle a captured payment: mark the order paid and take the stock down.
 *
 * Safe to call twice with the same payment. Razorpay retries on any non-2xx
 * and will re-deliver the same event, so "ran once" is not something this
 * can assume. The guard is the `and status = 'created'` below: the second
 * call matches no row, returns early, and stock is never decremented twice.
 *
 * Returns what it did, so a caller that is not an HTTP handler — the smoke
 * test — can assert on it:
 *   { settled: false }                        already settled, or not ours
 *   { settled: true, orderId, oversold }      moved it
 */
export async function markPaid(sql, payment) {
  const { order_id: razorpayOrderId, id: paymentId, amount } = payment;
  if (!razorpayOrderId) throw new Error("payment.captured without an order id");

  // The guard that makes a repeat delivery harmless: only an order still
  // sitting at 'created' moves, and only one delivery can win that race.
  const [order] = await sql`
    update orders
       set status = 'paid', razorpay_payment_id = ${paymentId}, paid_at = now()
     where razorpay_order_id = ${razorpayOrderId}
       and status = 'created'
     returning id, total_paise`;

  if (!order) return { settled: false }; // already settled, or never ours

  // What Razorpay captured should be what we asked for. If it is not,
  // something is wrong upstream and a human needs to look before we ship.
  if (amount != null && Number(amount) !== Number(order.total_paise)) {
    console.error(
      `amount mismatch on order ${order.id}: captured ${amount}, expected ${order.total_paise}`,
    );
  }

  const items = await sql`select sku, qty from order_items where order_id = ${order.id}`;

  let oversold = false;

  for (const item of items) {
    const [moved] = await sql`
      update stock set quantity = quantity - ${item.qty}, updated_at = now()
       where sku = ${item.sku} and quantity >= ${item.qty}
       returning sku`;

    if (!moved) {
      // Paid for something we no longer have. Stock is not reserved between
      // checkout and capture, so two shoppers can pass the same check; this
      // is the rare end of that trade-off. The money is already taken, so
      // the order is flagged rather than failed, and someone refunds or
      // reships by hand.
      console.error(`oversold ${item.sku} on order ${order.id} — needs a refund decision`);
      await sql`update orders set status = 'oversold' where id = ${order.id}`;
      oversold = true;
    }
  }

  return { settled: true, orderId: order.id, oversold };
}

/** A payment.failed event: give up on an order that never got paid. */
export async function markFailed(sql, payment) {
  const rows = await sql`
    update orders set status = 'failed'
     where razorpay_order_id = ${payment?.order_id ?? null}
       and status = 'created'
     returning id`;
  return { failed: rows.length > 0 };
}
