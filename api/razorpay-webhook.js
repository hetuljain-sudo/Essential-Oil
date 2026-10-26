/**
 * POST /api/razorpay-webhook
 *
 * Where an order becomes real. The browser returning from the payment screen
 * is a courtesy; this is the only message we trust, because it comes from
 * Razorpay's servers and is signed.
 *
 * Set it up in the Razorpay dashboard against the event `payment.captured`,
 * with the same secret as RAZORPAY_WEBHOOK_SECRET.
 *
 * Two rules this file exists to honour:
 *
 *  1. Verify before believing. An unsigned POST to this URL is a stranger
 *     claiming they paid.
 *  2. Be safe to deliver twice. Razorpay retries on any non-2xx, and will
 *     happily send the same event again. Marking an order paid must be an
 *     operation that can run a second time without moving stock twice.
 */

import { db } from "./_lib/db.mjs";
import { verifyWebhookSignature } from "./_lib/razorpay.mjs";
import { json, methodGuard, rawBody } from "./_lib/http.mjs";

// The signature is computed over the bytes as sent, so the platform must not
// parse the body out from under us.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (!methodGuard(req, res, "POST")) return;

  const raw = await rawBody(req);

  if (!verifyWebhookSignature(raw, req.headers["x-razorpay-signature"])) {
    console.warn("webhook rejected: bad signature");
    return json(res, 400, { error: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(res, 400, { error: "Invalid JSON." });
  }

  const sql = db();
  const eventId = req.headers["x-razorpay-event-id"] ?? null;

  // Record the delivery before acting on it. If the work below throws, we
  // still know what we were told.
  await sql`
    insert into webhook_events (event_id, event_type, payload)
    values (${eventId}, ${event.event ?? null}, ${JSON.stringify(event)})
    on conflict (event_id) do nothing`;

  try {
    if (event.event === "payment.captured") {
      await markPaid(sql, event.payload?.payment?.entity ?? {});
    } else if (event.event === "payment.failed") {
      const e = event.payload?.payment?.entity ?? {};
      await sql`
        update orders set status = 'failed'
        where razorpay_order_id = ${e.order_id} and status = 'created'`;
    }

    await sql`update webhook_events set processed_at = now() where event_id = ${eventId}`;

    // 200 on anything we understood, including events we chose to ignore —
    // a non-2xx asks Razorpay to send it again, forever.
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error("webhook processing failed:", err);
    await sql`update webhook_events set error = ${String(err?.message ?? err)} where event_id = ${eventId}`;
    // Do ask for a retry here: the failure was ours and may be transient.
    return json(res, 500, { error: "Processing failed." });
  }
}

async function markPaid(sql, payment) {
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

  if (!order) return; // already settled, or never ours

  // What Razorpay captured should be what we asked for. If it is not,
  // something is wrong upstream and a human needs to look before we ship.
  if (Number(amount) !== Number(order.total_paise)) {
    console.error(
      `amount mismatch on order ${order.id}: captured ${amount}, expected ${order.total_paise}`,
    );
  }

  const items = await sql`select sku, qty from order_items where order_id = ${order.id}`;

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
    }
  }
}
