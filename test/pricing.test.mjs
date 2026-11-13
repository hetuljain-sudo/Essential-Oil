/**
 * The money tests.
 *
 *   npm test
 *
 * No network, no database: priceCart is pure, which is the point of keeping
 * it separate from the endpoint. Everything here is a rule that, if it broke,
 * would charge a real person the wrong amount or sell stock we do not have.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { priceCart, shippingPaiseFor, skuOf, toPaise, CartError, MAX_QTY_PER_LINE }
  from "../api/_lib/pricing.mjs";
import { products, site } from "../src/data.mjs";

const lavender = products.find((p) => p.id === "lavender-fields");

/* Taken from the catalogue rather than typed in. These tests are about the
   pricing rules, not about what the pack sizes happen to be called this
   month — they used to say "15 ml" and broke the day the range moved to
   barrels, which told us nothing about the money. */
const SIZE_A = lavender.variants[0].size;
const SIZE_B = lavender.variants[1].size;
const LAV_A = skuOf("lavender-fields", SIZE_A);
const LAV_B = skuOf("lavender-fields", SIZE_B);
const priceA = lavender.variants[0].price;

/** Plenty of everything, so stock is never the thing under test. */
const ample = Object.fromEntries(
  products.flatMap((p) => p.variants.map((v) => [skuOf(p.id, v.size), 99])),
);

test("prices from the catalogue, not from the request", () => {
  const out = priceCart(
    // A tampered cart: the client claims this costs one paisa.
    [{ id: "lavender-fields", size: SIZE_A, qty: 2, price: 1, unitPricePaise: 1 }],
    ample,
  );
  assert.equal(out.lines[0].unitPricePaise, toPaise(priceA));
  assert.equal(out.subtotalPaise, toPaise(priceA) * 2);
});

test("totals are whole paise", () => {
  const out = priceCart([{ id: "lavender-fields", size: SIZE_A, qty: 3 }], ample);
  for (const n of [out.subtotalPaise, out.shippingPaise, out.totalPaise]) {
    assert.ok(Number.isInteger(n), `${n} is not an integer`);
  }
});

test("shipping is free at the threshold, not merely above it", () => {
  const at = toPaise(site.freeShippingAt);
  assert.equal(shippingPaiseFor(at), 0);
  assert.equal(shippingPaiseFor(at - 1), toPaise(site.shippingFlat));
  assert.equal(shippingPaiseFor(at + 1), 0);
});

test("an empty cart buys nothing", () => {
  assert.throws(() => priceCart([], ample), CartError);
  assert.throws(() => priceCart(null, ample), CartError);
});

test("refuses more than we hold", () => {
  assert.throws(
    () => priceCart([{ id: "lavender-fields", size: SIZE_A, qty: 3 }], { [LAV_A]: 2 }),
    (e) => e instanceof CartError && e.code === "insufficient_stock",
  );
});

test("a sku missing from the stock table counts as zero, not as unlimited", () => {
  assert.throws(
    () => priceCart([{ id: "lavender-fields", size: SIZE_A, qty: 1 }], {}),
    (e) => e.code === "insufficient_stock",
  );
});

test("the same size twice cannot be split past the stock check", () => {
  // Two lines of 2 against stock of 3: each passes alone, together they oversell.
  assert.throws(
    () => priceCart(
      [{ id: "lavender-fields", size: SIZE_A, qty: 2 },
       { id: "lavender-fields", size: SIZE_A, qty: 2 }],
      { [LAV_A]: 3 },
    ),
    (e) => e.code === "duplicate_line",
  );
});

test("different sizes of one oil are separate lines", () => {
  const out = priceCart(
    [{ id: "lavender-fields", size: SIZE_A, qty: 1 },
     { id: "lavender-fields", size: SIZE_B, qty: 1 }],
    { [LAV_A]: 1, [LAV_B]: 1 },
  );
  assert.equal(out.lines.length, 2);
});

test("rejects quantities that are not whole positive numbers", () => {
  for (const qty of [0, -1, 1.5, "2", NaN, undefined]) {
    assert.throws(
      () => priceCart([{ id: "lavender-fields", size: SIZE_A, qty }], ample),
      CartError,
      `qty ${String(qty)} should have been rejected`,
    );
  }
});

test("caps how many of one size an order can hold", () => {
  assert.throws(
    () => priceCart([{ id: "lavender-fields", size: SIZE_A, qty: MAX_QTY_PER_LINE + 1 }], ample),
    (e) => e.code === "qty_too_high",
  );
});

test("rejects an oil or size we do not sell", () => {
  assert.throws(
    () => priceCart([{ id: "no-such-oil", size: SIZE_A, qty: 1 }], ample),
    (e) => e.code === "unknown_item",
  );
  assert.throws(
    () => priceCart([{ id: "lavender-fields", size: "500 ml", qty: 1 }], ample),
    (e) => e.code === "unknown_item",
  );
});

test("every catalogue variant has a unique sku", () => {
  const skus = products.flatMap((p) => p.variants.map((v) => skuOf(p.id, v.size)));
  assert.equal(new Set(skus).size, skus.length, "two variants share a sku");
  assert.ok(skus.every(Boolean), "a variant produced no sku");
});

test("the total is the subtotal plus shipping, always", () => {
  for (const qty of [1, 2, 5]) {
    const out = priceCart([{ id: "lavender-fields", size: SIZE_A, qty }], ample);
    assert.equal(out.totalPaise, out.subtotalPaise + out.shippingPaise);
  }
});
