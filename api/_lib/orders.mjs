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

import { sendEmail } from "./email.mjs";
import { confirmationEmail } from "../../src/emails.mjs";

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
 *   { settled: true, orderId, oversold, confirmed }   moved it
 *
 * `sendMail` is injectable so db/smoke.mjs can run this whole path against a
 * real database and count what would have been sent, without a provider, a
 * key or a message reaching anyone. Nothing in production passes it.
 */
export async function markPaid(sql, payment, { sendMail = sendEmail } = {}) {
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

  /*
   * The confirmation. Wrapped, because nothing here may stop the webhook
   * answering 200: a non-2xx asks Razorpay to redeliver the whole event,
   * which would re-run everything above it. The money has moved and the
   * stock has moved; an email is not worth undoing that.
   *
   * It does add an outbound HTTP call to the webhook's own timeout budget,
   * which is the real cost of sending from here rather than from a queue.
   */
  let confirmed = false;
  if (!oversold) {
    try {
      confirmed = await sendConfirmation(sql, order.id, sendMail);
    } catch (err) {
      console.error(`order ${order.id} paid but confirmation threw:`, err);
    }
  }
  // An oversold order gets nothing. The money is taken and we cannot fulfil
  // it; that customer needs a person, not a cheerful "your order is
  // confirmed".

  return { settled: true, orderId: order.id, oversold, confirmed };
}

/**
 * Tell the customer their order went through. Once.
 *
 * ---
 *
 * **The idempotency decision, and its failure mode.**
 *
 * The send is *claimed* with a conditional update that only one caller can
 * win, and the claim is *released* if the send fails. So:
 *
 *   claim  -> send ok      -> confirmed_email_at stays set
 *   claim  -> send failed  -> set back to null, and the log says why
 *   no claim (already set) -> nothing sent
 *
 * Claiming before sending rather than stamping after is what makes two
 * callers safe: stamping after would let both send before either stamped.
 * Releasing on failure is what keeps the column honest — it means "a
 * provider accepted a message", so null genuinely reads as "this customer is
 * still owed one", and `npm run db:check` reports any that are.
 *
 * **What breaks it:** if the process dies between the claim and the release,
 * the column says sent when nothing was. That order then looks settled to
 * every later check and the customer is never told. It is the one case this
 * cannot cover, it is rarer than the double-send it prevents, and the
 * db:check report is where it would be noticed.
 *
 * Note also that markPaid returns early on a redelivery — only one delivery
 * wins `status = 'created'` — so a crash between settling the order and
 * reaching this function loses the confirmation too. The guard here protects
 * against concurrent callers and against a future resend path, not against
 * the process dying.
 */
async function sendConfirmation(sql, orderId, sendMail) {
  // Claim it. A second caller gets no row and sends nothing.
  const [claim] = await sql`
    update orders set confirmed_email_at = now()
     where id = ${orderId} and confirmed_email_at is null
     returning id`;

  if (!claim) return false;

  const [order] = await sql`
    select o.id, o.subtotal_paise, o.shipping_paise, o.total_paise,
           o.customer_name, o.customer_email, o.customer_phone,
           o.address_line1, o.address_line2, o.address_city,
           o.address_state, o.address_postcode,
           coalesce(
             json_agg(json_build_object(
               'name', i.name, 'size', i.size, 'qty', i.qty, 'linePaise', i.line_paise
             ) order by i.id) filter (where i.id is not null),
             '[]'
           ) as items
      from orders o
      left join order_items i on i.order_id = o.id
     where o.id = ${orderId}
     group by o.id`;

  if (order && typeof order.items === "string") order.items = JSON.parse(order.items);

  let result = { sent: false, reason: "the order vanished between settling and sending" };

  if (order) {
    const { subject, text } = confirmationEmail(order);
    result = await sendMail({
      to: order.customer_email,
      toName: order.customer_name,
      subject,
      text,
    });
  }

  if (!result.sent) {
    // Release the claim, so the column keeps meaning what it says.
    await sql`update orders set confirmed_email_at = null where id = ${orderId}`;
    console.error(`order ${orderId} paid but not confirmed by email: ${result.reason}`);
    return false;
  }

  return true;
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
