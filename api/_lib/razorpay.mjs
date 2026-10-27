/**
 * Razorpay, over plain fetch.
 *
 * No SDK. The surface we need is two REST calls and two HMACs, and a
 * dependency that can reach the payment path is a dependency worth not having.
 *
 * Keys: the key id is public and ships to the browser. The key secret and the
 * webhook secret never leave the server. If a secret ever appears in anything
 * under src/, it has been leaked and must be rotated in the Razorpay
 * dashboard — the repository is not where that gets fixed.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.razorpay.com/v1";

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — see .env.example`);
  return v;
};

export const keyId = () => need("RAZORPAY_KEY_ID");

/** True when we are pointed at test keys rather than live ones. */
export const isTestMode = () => keyId().startsWith("rzp_test");

function authHeader() {
  const basic = Buffer.from(`${need("RAZORPAY_KEY_ID")}:${need("RAZORPAY_KEY_SECRET")}`).toString("base64");
  return `Basic ${basic}`;
}

/**
 * Ask Razorpay to open an order for `amountPaise`.
 *
 * `receipt` is our own order id, which is how a payment in their dashboard
 * can be traced back to a row in ours.
 */
export async function createOrder({ amountPaise, receipt, notes }) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: authHeader() },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
      payment_capture: 1,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Their message is for us, not the shopper: it can name internal reasons.
    throw new Error(`Razorpay order failed (${res.status}): ${body?.error?.description ?? "unknown"}`);
  }
  return body;
}

/** Constant-time compare, tolerant of differing lengths. */
function matches(a, b) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * Verify a webhook delivery against the raw request body.
 *
 * This is the only signature check in the codebase. A matching verifier for
 * the handshake the browser hands back after payment used to live here and
 * was never called: the webhook settles orders, and a browser-side check
 * proves only that a response was not forged in transit, never that money
 * moved. It was removed rather than kept unused, because unused crypto
 * invites a later caller to mistake it for proof of payment.
 *
 * Must be given the exact bytes received. Re-serialising the parsed JSON
 * changes key order and whitespace, and the signature stops matching — which
 * looks like an attack and is in fact our own doing.
 */
export function verifyWebhookSignature(rawBody, signature) {
  const expected = createHmac("sha256", need("RAZORPAY_WEBHOOK_SECRET"))
    .update(rawBody)
    .digest("hex");
  return matches(expected, String(signature ?? ""));
}
