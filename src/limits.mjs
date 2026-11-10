/**
 * How much one order may contain.
 *
 * These are the shop's rules, and the server enforces them — api/_lib/pricing.mjs
 * refuses a cart that breaks either, because a limit the browser alone keeps
 * is not a limit at all.
 *
 * They live here, apart from the pricing, so the browser can read them too.
 * It could not before, and the result was a cart you were allowed to build
 * and not allowed to buy: with twenty-four bottles in stock the quantity
 * stepper went to twenty-four, and the checkout then refused anything over
 * ten with a message that arrived far too late to be useful.
 *
 * Shared with app.js the same way redirect, csv, image, sale and bottle are.
 */

/** Distinct products in one order. */
export const MAX_LINES = 20;

/** Of any one product and size. */
export const MAX_QTY_PER_LINE = 10;

/**
 * The most of this variant anyone may put in a cart.
 *
 * Whichever runs out first: the shelf, or the per-line rule. Returning the
 * smaller of the two is what lets the stepper stop in the right place and
 * say the right reason.
 */
export const maxForVariant = (variant) =>
  Math.max(0, Math.min(Number(variant?.stock ?? 0), MAX_QTY_PER_LINE));

/**
 * Why the stepper stopped, for a message worth reading.
 *
 * "Only 3 left" and "10 is the most of one size" are different facts and a
 * shopper deserves the one that is true.
 */
export function limitReason(variant, name = "", size = "") {
  const stock = Number(variant?.stock ?? 0);
  if (stock <= 0) return `${name} ${size} has sold out.`.trim();
  if (stock < MAX_QTY_PER_LINE) return `Only ${stock} of ${name} ${size} in stock.`.replace(/\s+/g, " ").trim();
  return `${MAX_QTY_PER_LINE} is the most of any one size per order.`;
}
