/**
 * How much one order may contain.
 *
 * These numbers are enforced by api/_lib/pricing.mjs, and were enforced ONLY
 * there: the browser capped the quantity stepper on stock alone, so with
 * twenty-four bottles on the shelf a shopper could put twelve in the cart
 * and be refused at checkout, by a rule they had no way of knowing about.
 *
 * The module exists so both sides read one definition. These tests hold the
 * two sides to it.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { MAX_LINES, MAX_QTY_PER_LINE, maxForVariant, limitReason } from "../src/limits.mjs";
import * as pricing from "../api/_lib/pricing.mjs";
import { products } from "../src/data.mjs";
import { skuFor } from "../src/sku.mjs";

/* Size and sku come from the catalogue. These tests are about the cap, not
   about what a pack happens to be called — hard-coding "15 ml" and
   "SRV-LAVENDE-15ML" meant they failed when the range moved to barrels,
   which said nothing about the limits they exist to check. */
const LAV = products.find((p) => p.id === "lavender-fields");
const SIZE = LAV.variants[0].size;
const LAV_SKU = skuFor(LAV, LAV.variants[0]);

test("the server and the shared module agree", () => {
  // If these ever diverge, the cart is buildable and the order is not.
  assert.equal(pricing.MAX_LINES, MAX_LINES);
  assert.equal(pricing.MAX_QTY_PER_LINE, MAX_QTY_PER_LINE);
});

test("the cap is the smaller of stock and the per-line rule", () => {
  assert.equal(maxForVariant({ stock: 24 }), MAX_QTY_PER_LINE);
  assert.equal(maxForVariant({ stock: 3 }), 3);
  assert.equal(maxForVariant({ stock: MAX_QTY_PER_LINE }), MAX_QTY_PER_LINE);
});

test("sold out caps at zero, never below", () => {
  assert.equal(maxForVariant({ stock: 0 }), 0);
  assert.equal(maxForVariant({ stock: -5 }), 0);
  assert.equal(maxForVariant(undefined), 0);
  assert.equal(maxForVariant({}), 0);
});

test("the reason given is the one that is true", () => {
  // Plenty in stock, so the rule is what stops you.
  assert.match(limitReason({ stock: 24 }, "Lavender", SIZE), /most of any one size/);
  // Nearly gone, so the shelf is what stops you.
  assert.match(limitReason({ stock: 3 }, "Lavender", SIZE), new RegExp(`Only 3 of Lavender ${SIZE}`));
  assert.match(limitReason({ stock: 0 }, "Lavender", SIZE), /sold out/);
});

test("a cart at the cap is one priceCart accepts", () => {
  // The point of the whole module: what the browser allows, the server takes.
  const stock = { [LAV_SKU]: 24 };
  const qty = maxForVariant({ stock: 24 });
  assert.doesNotThrow(() =>
    pricing.priceCart([{ id: "lavender-fields", size: SIZE, qty }], stock));
});

test("one more than the cap is what priceCart refuses", () => {
  const stock = { [LAV_SKU]: 24 };
  assert.throws(
    () => pricing.priceCart([{ id: "lavender-fields", size: SIZE, qty: MAX_QTY_PER_LINE + 1 }], stock),
    /up to 10/,
  );
});
