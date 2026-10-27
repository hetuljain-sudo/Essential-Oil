/**
 * What the emails actually say.
 *
 * Separate from the sending so the wording can be read, reviewed and tested
 * without a provider, an API key or a network. These are the words a
 * customer receives from this business; they deserve to be somewhere you can
 * find and change them, not buried in a handler.
 *
 * Plain text, not HTML. A thank-you from a small business reads better as a
 * note than as a branded template, it cannot render wrongly in any client,
 * and it never lands in spam for having one image and three links.
 *
 * Nothing here promises anything the shop cannot do. No delivery date, no
 * tracking we do not have, no "your order will arrive by" — the dispatch
 * window comes from the site's own FAQ and nowhere else.
 */

import { site } from "./data.mjs";

/**
 * Where to tell a customer the shop is.
 *
 * `site.url` is the canonical address the site will have once the domain is
 * bought. It is correct for `<link rel=canonical>`, where it describes an
 * intent, and wrong in an email, where it is an instruction to a person: send
 * someone to a domain that does not resolve and you have given a stranger a
 * reason to doubt the order was real.
 *
 * PUBLIC_URL is whatever the shop is actually reachable at today. Set it in
 * the host's environment; when the domain exists, delete it and this falls
 * back to site.url on its own.
 */
const publicUrl = () => (process.env.PUBLIC_URL || site.url).replace(/\/+$/, "");

/** "1x Lavender Fields 15 ml" per line, indented under the order. */
const itemLines = (items = []) =>
  items.map((i) => `  ${i.qty} x ${i.name} ${i.size}`).join("\n");

const rupees = (paise) => `${site.currency}${(Number(paise ?? 0) / 100).toLocaleString("en-IN")}`;

/** First name only, because "Dear Arjun Singh Rathore" reads like a bank. */
const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] || "there";

/**
 * The thank-you an admin sends by hand from the orders page.
 *
 * Deliberately not automatic. It is sent when someone has actually looked at
 * the order, which is the only thing that makes a thank-you worth receiving.
 */
export function thankYouEmail(order) {
  const subject = `Thank you for your order — ${site.name}`;

  const text = `Hi ${firstName(order.customer_name)},

Thank you for ordering from ${site.name}. It means a lot — we are a small
operation, and every order is noticed by a person.

Here is what you bought:

${itemLines(order.items)}

Total: ${rupees(order.total_paise)}

${order.tracking
  ? `Your parcel is on its way. Tracking reference: ${order.tracking}`
  : `We pack and dispatch within two working days, and you will hear from us
again when it goes out.`}

If anything is wrong with the order, reply to this email and it will reach us
directly.

Thank you,
${site.name}
${publicUrl()}`;

  return { subject, text };
}

/**
 * Sent when an order is marked shipped.
 *
 * Only says there is a tracking number when there is one. A dispatch notice
 * with an empty tracking line is worse than no notice, because it reads like
 * something failed.
 */
export function dispatchEmail(order) {
  const subject = `Your ${site.name} order is on its way`;

  const text = `Hi ${firstName(order.customer_name)},

Your order has been packed and handed to the courier.

${itemLines(order.items)}

${order.tracking ? `Tracking reference: ${order.tracking}\n` : ""}
Delivery usually takes three to five days from dispatch, depending on where
you are.

If it has not arrived within a week, reply to this email and we will chase it.

Thank you,
${site.name}
${publicUrl()}`;

  return { subject, text };
}
