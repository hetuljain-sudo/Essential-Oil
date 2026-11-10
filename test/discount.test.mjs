/**
 * Discount code rules.
 *
 * Everything here is arithmetic and refusals, so none of it needs a database.
 * The cases that matter are the ones where a code could cost money: a cart
 * taken to zero, a percentage above the ceiling, a fixed amount larger than
 * the basket, and an expiry that has passed.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCode, readCode, parseDefinition, refusalFor, rawDiscountPaise,
  applyDiscount, describeDiscount, MIN_PAYABLE_PAISE, MAX_PERCENT,
} from "../src/discount.mjs";

/** A stored row, in the snake_case the driver returns. */
const row = (over = {}) => ({
  code: "DIWALI10", kind: "percent", value: 10,
  min_subtotal_paise: 0, max_redemptions: null, times_redeemed: 0,
  expires_at: null, active: true,
  ...over,
});

const NOW = new Date("2026-11-07T12:00:00Z");

/* ------------------------------------------------------------ the spelling */

test("one code, however it was typed", () => {
  assert.equal(normalizeCode("diwali10"), "DIWALI10");
  assert.equal(normalizeCode("  Diwali10 "), "DIWALI10");
  assert.equal(normalizeCode("DIWALI 10"), "DIWALI10");
  assert.equal(normalizeCode(null), "");
});

test("refuses a code that is not shaped like one", () => {
  assert.ok(readCode("").error);
  assert.ok(readCode("AB").error, "two characters is too short to not be guessed");
  assert.ok(readCode("DIWALI_10").error, "underscores are not in the alphabet");
  assert.ok(readCode("-LEADING").error);
  assert.equal(readCode("diwali-10").code, "DIWALI-10");
});

/* ---------------------------------------------------------- what admins type */

test("accepts a sound percentage code", () => {
  const { definition, errors } = parseDefinition({ code: "diwali10", kind: "percent", value: 10 });
  assert.equal(errors, undefined);
  assert.deepEqual(definition, {
    code: "DIWALI10", kind: "percent", value: 10,
    minSubtotalPaise: 0, maxRedemptions: null, expiresAt: null,
  });
});

test("refuses a percentage above the ceiling", () => {
  const { errors } = parseDefinition({ code: "HALFPRICE", kind: "percent", value: MAX_PERCENT + 1 });
  assert.ok(errors.some((e) => e.includes(`${MAX_PERCENT}%`)));
});

test("a fixed code must leave at least a rupee payable", () => {
  // ₹500 off with no minimum is a free bottle.
  const bad = parseDefinition({ code: "FIVEHUNDRED", kind: "fixed", value: 50000 });
  assert.ok(bad.errors.some((e) => e.includes("minimum spend")));

  const ok = parseDefinition({
    code: "FIVEHUNDRED", kind: "fixed", value: 50000,
    minSubtotalPaise: 50000 + MIN_PAYABLE_PAISE,
  });
  assert.equal(ok.errors, undefined);
});

test("reports every problem at once, not the first", () => {
  const { errors } = parseDefinition({ code: "no", kind: "magic", value: 0 });
  assert.ok(errors.length >= 3, `expected several, got ${JSON.stringify(errors)}`);
});

test("an empty usage limit means unlimited, not zero", () => {
  assert.equal(parseDefinition({ code: "OPEN10", kind: "percent", value: 10, maxRedemptions: "" })
    .definition.maxRedemptions, null);
  assert.ok(parseDefinition({ code: "OPEN10", kind: "percent", value: 10, maxRedemptions: 0 }).errors);
});

/* ------------------------------------------------------------- the refusals */

test("accepts a live code", () => {
  assert.equal(refusalFor(row(), 100000, NOW), null);
});

test("names each reason a code cannot be used", () => {
  assert.equal(refusalFor(null, 100000, NOW).code, "unknown_code");
  assert.equal(refusalFor(row({ active: false }), 100000, NOW).code, "inactive_code");
  assert.equal(
    refusalFor(row({ expires_at: "2026-11-01T00:00:00Z" }), 100000, NOW).code, "expired_code");
  assert.equal(
    refusalFor(row({ max_redemptions: 50, times_redeemed: 50 }), 100000, NOW).code, "code_used_up");
  assert.equal(
    refusalFor(row({ min_subtotal_paise: 200000 }), 100000, NOW).code, "below_minimum");
});

test("an expiry is a moment, not a day — the code works up to it", () => {
  const expires = "2026-11-07T18:00:00Z";
  assert.equal(refusalFor(row({ expires_at: expires }), 100000, NOW), null);
  assert.equal(
    refusalFor(row({ expires_at: expires }), 100000, new Date("2026-11-07T18:00:01Z")).code,
    "expired_code");
});

test("the minimum is judged on the subtotal, and the boundary is inclusive", () => {
  assert.equal(refusalFor(row({ min_subtotal_paise: 99900 }), 99900, NOW), null);
  assert.equal(refusalFor(row({ min_subtotal_paise: 99900 }), 99899, NOW).code, "below_minimum");
});

/* ------------------------------------------------------------ the arithmetic */

test("a percentage comes off the subtotal", () => {
  assert.equal(rawDiscountPaise(row({ value: 25 }), 100000), 25000);
});

test("a percentage lands on a whole rupee", () => {
  // 10% of ₹699 is ₹69.90, which would render as "₹69.9" and make a total
  // of "₹708.1". The shop deals in whole rupees; so does the discount.
  assert.equal(rawDiscountPaise(row({ value: 10 }), 69900), 7000);
  assert.equal(rawDiscountPaise(row({ value: 10 }), 69900) % 100, 0);
  // Nearest, not down: ₹69.90 goes up to ₹70, ₹69.30 would go down to ₹69.
  assert.equal(rawDiscountPaise(row({ value: 10 }), 69300), 6900);
});

test("rounding up can never exceed the subtotal", () => {
  // A 100% code is impossible through parseDefinition, but the arithmetic
  // must not invent money if a row is ever edited by hand in the database.
  // 100% of 199 paise is 199, which rounds up to 200 — more than the basket.
  assert.equal(rawDiscountPaise(row({ value: 100 }), 199), 199);
});

test("a fixed amount never exceeds the subtotal", () => {
  assert.equal(rawDiscountPaise(row({ kind: "fixed", value: 50000 }), 30000), 30000);
});

test("shipping is not discounted and the free-shipping line is judged before the code", () => {
  // ₹1,050 of oil ships free. A 20% code takes ₹210 off the oil, not the post.
  const out = applyDiscount(
    { subtotalPaise: 105000, shippingPaise: 0 }, row({ value: 20 }), NOW);
  assert.equal(out.discountPaise, 21000);
  assert.equal(out.totalPaise, 84000, "still free shipping, despite falling under ₹999");
  assert.equal(out.totalPaise % 100, 0, "and the total stays a whole number of rupees");
});

test("shipping survives the discount on a small order", () => {
  const out = applyDiscount(
    { subtotalPaise: 50000, shippingPaise: 7900 }, row({ value: 10 }), NOW);
  assert.equal(out.discountPaise, 5000);
  assert.equal(out.totalPaise, 50000 + 7900 - 5000);
});

test("a code can never take the payable total below a rupee", () => {
  // A fixed code exactly the size of the basket, with no shipping to absorb it.
  const out = applyDiscount(
    { subtotalPaise: 100000, shippingPaise: 0 },
    row({ kind: "fixed", value: 100000, min_subtotal_paise: 0 }),
    NOW);
  assert.equal(out.totalPaise, MIN_PAYABLE_PAISE);
  assert.equal(out.discountPaise, 100000 - MIN_PAYABLE_PAISE);
});

test("applying a refused code throws rather than quietly discounting nothing", () => {
  assert.throws(
    () => applyDiscount({ subtotalPaise: 1000, shippingPaise: 7900 },
      row({ min_subtotal_paise: 200000 }), NOW),
    { code: "below_minimum" });
});

test("says what a code is worth in words", () => {
  assert.equal(describeDiscount({ kind: "percent", value: 10 }), "10% off");
  assert.equal(describeDiscount({ kind: "fixed", value: 20000 }), "₹200 off");
});
