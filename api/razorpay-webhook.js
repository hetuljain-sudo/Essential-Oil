/**
 * POST /api/razorpay-webhook
 *
 * Where an order becomes real. The browser returning from the payment screen
 * is a courtesy; this is the only message we trust, because it comes from
 * Razorpay's servers and is signed.
 *
 * Set it up in the Razorpay dashboard against `payment.captured` and
 * `payment.failed`, with the same secret as RAZORPAY_WEBHOOK_SECRET.
 *
 * Three rules this file exists to honour:
 *
 *  1. Verify before believing. An unsigned POST to this URL is a stranger
 *     claiming they paid.
 *  2. Be safe to deliver twice. Razorpay retries on any non-2xx and will
 *     happily send the same event again. Marking an order paid must be an
 *     operation that can run a second time without moving stock twice.
 *  3. Hash the bytes that arrived. Not a re-serialisation of them.
 *
 * On (3): this uses the Web handler signature — `Request` in, `Response`
 * out — rather than the Node `(req, res)` one the other endpoints use.
 * That is deliberate. The platform parses a JSON body into `req.body` for
 * Node-style functions, and once it has, the original bytes are gone.
 * `await request.text()` is defined to give exactly what was sent, which is
 * what the signature was computed over. Re-serialising parsed JSON changes
 * key order and whitespace, the signature stops matching, and every real
 * payment then looks like a forgery.
 */

import { db } from "./_lib/db.mjs";
import { verifyWebhookSignature } from "./_lib/razorpay.mjs";
import { markPaid, markFailed } from "./_lib/orders.mjs";

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST." }), {
      status: 405,
      headers: { "content-type": "application/json", allow: "POST" },
    });
  }

  const raw = await request.text();

  /*
   * Verifying needs RAZORPAY_WEBHOOK_SECRET, and asking for one that is not
   * set throws rather than returning false. Caught here so a misconfigured
   * deployment says so in the log instead of answering an opaque 500 that
   * looks like our bug rather than our configuration.
   *
   * Either way this is a 400: we cannot establish that the message came from
   * Razorpay, and that is the only question this check asks.
   */
  let verified = false;
  try {
    verified = verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"));
  } catch (err) {
    console.error(`webhook cannot be verified: ${err.message}`);
    return reply(400, { error: "Invalid signature." });
  }

  if (!verified) {
    console.warn("webhook rejected: bad signature");
    return reply(400, { error: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return reply(400, { error: "Invalid JSON." });
  }

  const sql = db();
  const eventId = request.headers.get("x-razorpay-event-id") ?? null;

  // Record the delivery before acting on it. If the work below throws, we
  // still know what we were told and when.
  await sql`
    insert into webhook_events (event_id, event_type, payload)
    values (${eventId}, ${event.event ?? null}, ${JSON.stringify(event)})
    on conflict (event_id) do nothing`;

  try {
    if (event.event === "payment.captured") {
      await markPaid(sql, event.payload?.payment?.entity ?? {});
    } else if (event.event === "payment.failed") {
      await markFailed(sql, event.payload?.payment?.entity ?? {});
    }

    await sql`update webhook_events set processed_at = now() where event_id = ${eventId}`;

    // 200 for anything we understood, including events we chose to ignore —
    // a non-2xx asks Razorpay to send it again, and again.
    return reply(200, { ok: true });
  } catch (err) {
    console.error("webhook processing failed:", err);
    await sql`update webhook_events set error = ${String(err?.message ?? err)} where event_id = ${eventId}`;
    // Do ask for a retry here: the failure was ours and may be transient.
    return reply(500, { error: "Processing failed." });
  }
}
