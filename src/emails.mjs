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

/**
 * The same lines with what each one cost, for the confirmation.
 *
 * Plain text has no table, so the price is pushed right with padding and the
 * whole block relies on a monospace-ish reading. It stays legible in a
 * proportional font too, which most mail clients use.
 */
const pricedLines = (items = []) =>
  items.map((i) => {
    const left = `  ${i.qty} x ${i.name} ${i.size}`;
    const right = rupees(i.linePaise ?? i.line_paise);
    const gap = Math.max(2, 46 - left.length);
    return left + " ".repeat(gap) + right;
  }).join("\n");

/** A delivery address as a person would write it on a parcel. */
const addressBlock = (o) => [
  o.customer_name,
  o.address_line1,
  o.address_line2,
  `${o.address_city}, ${o.address_state} ${o.address_postcode}`,
  o.customer_phone ? `Phone: ${o.customer_phone}` : null,
].filter(Boolean).map((line) => `  ${line}`).join("\n");

/**
 * A short, readable form of the order id.
 *
 * The full uuid is what the database knows and what support needs, so it is
 * given in full. This is only the opening line, where thirty-six characters
 * of hex would say nothing to anyone.
 */
const reference = (id) => String(id ?? "").slice(0, 8).toUpperCase();

const rupees = (paise) => `${site.currency}${(Number(paise ?? 0) / 100).toLocaleString("en-IN")}`;

/** First name only, because "Dear Arjun Singh Rathore" reads like a bank. */
const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] || "there";

/**
 * Sent automatically the moment a payment settles.
 *
 * The one email that is not optional: a customer who has just been charged
 * and hears nothing has no way to tell a successful order from a failed one,
 * and their next move is a worried email or a chargeback.
 *
 * Everything in it comes from the order as recorded — the line items are
 * read from order_items, which copied the name, size and price at the moment
 * of sale. Looking them up in the catalogue would mean a confirmation that
 * silently changes if an oil is renamed or repriced next year.
 *
 * Money arrives as integer paise and is divided only here, for display.
 */
export function confirmationEmail(order) {
  const subject = `Order confirmed — ${site.name} (${reference(order.id)})`;

  const shipping = Number(order.shipping_paise ?? 0);

  const text = `Hi ${firstName(order.customer_name)},

Your order is confirmed and paid. Thank you.

Order reference: ${reference(order.id)}
Full reference: ${order.id}

What you bought
${pricedLines(order.items)}

Subtotal${" ".repeat(Math.max(2, 46 - 8))}${rupees(order.subtotal_paise)}
Shipping${" ".repeat(Math.max(2, 46 - 8))}${shipping === 0 ? "Free" : rupees(shipping)}
Total${" ".repeat(Math.max(2, 46 - 5))}${rupees(order.total_paise)}

Going to
${addressBlock(order)}

We pack and dispatch within two working days, and you will hear from us again
when it goes out.

If anything here is wrong — the address especially — reply to this email now
and we will fix it before it ships.

Thank you,
${site.name}
${publicUrl()}`;

  return { subject, text };
}

/**
 * Sent to us, not to a customer: somebody used the contact form.
 *
 * Until this existed a message sat in a table until someone happened to open
 * the admin page, which for a one-person business means a day or three.
 *
 * The reply-to is set to the sender, so answering this email answers them.
 */
export function contactEmail(message) {
  const subject = message.subject
    ? `Contact form: ${message.subject}`
    : `Contact form message from ${message.name}`;

  const text = `${message.name} <${message.email}> wrote:

${message.body}

---
${message.customer_id ? "Sent while logged in to an account." : "Sent by a visitor who was not logged in."}
Reply to this email and it goes straight back to them.

Read and mark it handled at ${publicUrl()}/admin/`;

  return { subject, text };
}

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
