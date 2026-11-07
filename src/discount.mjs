/**
 * What a discount code is worth, and whether it may be used.
 *
 * Pure arithmetic and rules. No database, no request, no clock of its own —
 * the caller passes `now`, so a test can sit on either side of an expiry
 * without waiting. The server imports this to decide what to charge; the
 * admin page imports the same limits to refuse a code it would never accept.
 *
 * Money is integer paise throughout, like the rest of the shop.
 *
 * Two rules worth stating before the code, because both are decisions rather
 * than arithmetic:
 *
 *   Shipping is never discounted, and the free-shipping threshold is judged
 *   on the subtotal BEFORE the discount. A ₹1,050 cart with a 20% code keeps
 *   its free shipping. The alternative — discount first, then decide — hands
 *   someone a ₹210 saving and a ₹79 charge they did not have a moment ago,
 *   which reads as a trick even when the maths is honest.
 *
 *   A discount may never take the payable total below ₹1. Razorpay will not
 *   accept an order under a rupee, and `orders.total_paise` is checked > 0 in
 *   the schema, so a code that would zero a cart is capped rather than
 *   refused. The shopper is told what came off, which is the true number.
 */

/** Razorpay's floor, and the schema's. */
export const MIN_PAYABLE_PAISE = 100;

/**
 * Half off is the most any code may be worth.
 *
 * Not a technical limit. It is the number that makes a mistyped "90" at the
 * admin screen a refusal rather than a weekend of selling at a tenth of
 * cost, and the shop has no margin data in it to check against anything
 * cleverer.
 */
export const MAX_PERCENT = 50;

/** Letters, digits and hyphens. Long enough to not be guessed in a loop. */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

export const DISCOUNT_KINDS = ["percent", "fixed"];

/** A refusal the shopper can act on — safe to show them verbatim. */
export class DiscountError extends Error {
  constructor(message, code = "invalid_code") {
    super(message);
    this.name = "DiscountError";
    this.code = code;
  }
}

/**
 * The canonical form of whatever was typed.
 *
 * Codes are printed on cards and read aloud, so they arrive with stray
 * spaces and in whatever case the keyboard was in. One spelling is stored
 * and compared; `diwali25`, ` Diwali25 ` and `DIWALI 25` are one code.
 */
export const normalizeCode = (raw) =>
  String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");

/** `{ code }` or `{ error }` — the shape check, before any lookup. */
export function readCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return { error: "Enter a code." };
  if (!CODE_PATTERN.test(code)) {
    return { error: "That doesn't look like one of our codes." };
  }
  return { code };
}

/**
 * Check what an admin typed, before it reaches the database.
 *
 * Returns `{ definition }` or `{ errors }` with every problem, not the first:
 * a form that reveals its objections one at a time is a form people fill in
 * four times.
 */
export function parseDefinition(input = {}) {
  const errors = [];

  const { code, error: codeError } = readCode(input.code);
  if (codeError) errors.push(codeError);

  const kind = String(input.kind ?? "").trim();
  if (!DISCOUNT_KINDS.includes(kind)) errors.push("Choose a percentage or an amount off.");

  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 1) {
    errors.push("The value has to be a whole number of at least one.");
  } else if (kind === "percent" && value > MAX_PERCENT) {
    errors.push(`${MAX_PERCENT}% is the most a code may take off.`);
  }

  const minSubtotal = Number(input.minSubtotalPaise ?? 0);
  if (!Number.isInteger(minSubtotal) || minSubtotal < 0) {
    errors.push("The minimum spend has to be a whole number of paise, or nothing.");
  }

  /*
   * A fixed code worth more than its own minimum spend is the mistake that
   * costs money: ₹500 off with no minimum is a free ₹499 bottle. The rule is
   * that the minimum must leave at least a rupee payable, which is the same
   * floor the applied discount is capped at.
   */
  if (kind === "fixed" && Number.isInteger(value) && Number.isInteger(minSubtotal)) {
    if (minSubtotal < value + MIN_PAYABLE_PAISE) {
      errors.push("Set a minimum spend at least ₹1 above the amount off, or the code can empty a cart.");
    }
  }

  const maxRedemptions = input.maxRedemptions == null || input.maxRedemptions === ""
    ? null
    : Number(input.maxRedemptions);
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
    errors.push("A usage limit has to be a whole number of at least one, or left empty.");
  }

  let expiresAt = null;
  if (input.expiresAt) {
    expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) errors.push("That expiry date could not be read.");
  }

  if (errors.length) return { errors };
  return { definition: { code, kind, value, minSubtotalPaise: minSubtotal, maxRedemptions, expiresAt } };
}

/**
 * Why this code cannot be used on this cart, or null.
 *
 * `def` is a row as the database stores it, in snake_case, because that is
 * what the driver hands back and translating it twice is a place for a typo
 * to hide. Nothing here is worth a thrown error: the caller wants the reason.
 */
export function refusalFor(def, subtotalPaise, now = new Date()) {
  if (!def) return new DiscountError("We don't recognise that code.", "unknown_code");

  if (def.active === false) {
    return new DiscountError("That code is no longer active.", "inactive_code");
  }
  if (def.expires_at && new Date(def.expires_at) <= now) {
    return new DiscountError("That code has expired.", "expired_code");
  }
  if (def.max_redemptions != null && Number(def.times_redeemed ?? 0) >= Number(def.max_redemptions)) {
    return new DiscountError("That code has been fully used.", "code_used_up");
  }
  if (subtotalPaise < Number(def.min_subtotal_paise ?? 0)) {
    const short = Number(def.min_subtotal_paise) / 100;
    return new DiscountError(
      `That code needs a basket of ₹${short.toLocaleString("en-IN")} or more.`,
      "below_minimum",
    );
  }
  return null;
}

/**
 * What comes off, in paise.
 *
 * A percentage is rounded to the nearest whole rupee, not to the paisa.
 *
 * That is a display decision as much as an arithmetic one. Every price in
 * this shop is a whole number of rupees, so until codes existed no total
 * ever had paise in it — and 10% of ₹699 is ₹69.90, which renders as
 * "₹69.9" and a total of "₹708.1". Both look like a bug to the person about
 * to pay. Rounding to the nearest rupee keeps the shop in whole rupees
 * everywhere, and rounding to the NEAREST rather than down means the
 * rounding falls the customer's way as often as not.
 */
export function rawDiscountPaise(def, subtotalPaise) {
  if (def.kind === "percent") {
    const exact = (subtotalPaise * Number(def.value)) / 100;
    return Math.min(Math.round(exact / 100) * 100, subtotalPaise);
  }
  return Math.min(Number(def.value), subtotalPaise);
}

/**
 * Apply a code to a priced cart.
 *
 * Returns the discount and the new total, with the cap already applied.
 * Throws DiscountError if the code may not be used at all — the caller
 * answers 400 with the message.
 */
export function applyDiscount({ subtotalPaise, shippingPaise }, def, now = new Date()) {
  const refusal = refusalFor(def, subtotalPaise, now);
  if (refusal) throw refusal;

  const gross = subtotalPaise + shippingPaise;
  const wanted = rawDiscountPaise(def, subtotalPaise);
  // Never below a rupee payable. See the header: capped, not refused.
  const discountPaise = Math.max(0, Math.min(wanted, gross - MIN_PAYABLE_PAISE));

  return {
    code: def.code,
    discountPaise,
    totalPaise: gross - discountPaise,
  };
}

/** "10% off" / "₹200 off" — one phrasing, used by the page and the admin list. */
export const describeDiscount = (def) =>
  def.kind === "percent"
    ? `${def.value}% off`
    : `₹${(Number(def.value) / 100).toLocaleString("en-IN")} off`;
