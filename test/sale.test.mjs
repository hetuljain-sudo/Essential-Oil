/**
 * Reduced prices.
 *
 * The rule being defended: a struck-through price must be a real previous
 * price, and anything that is not a genuine reduction must not render at
 * all. A decorative bigger number next to the real one is a misleading price,
 * so these tests are about what is refused as much as what is accepted.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { saleOn, onSale, bestSale } from "../src/sale.mjs";
import { products } from "../src/data.mjs";

test("a real reduction is described", () => {
  const sale = saleOn({ size: "15 ml", price: 599, was: 699 });
  assert.equal(sale.price, 599);
  assert.equal(sale.was, 699);
  assert.equal(sale.off, 100);
  assert.equal(sale.percent, 14);
});

test("no `was` is not a sale", () => {
  assert.equal(saleOn({ size: "15 ml", price: 699 }), null);
});

test("a `was` that is not higher is refused", () => {
  // Equal is a typo; lower is either a typo or an invention. Neither should
  // put a struck-through number on the page.
  assert.equal(saleOn({ price: 699, was: 699 }), null);
  assert.equal(saleOn({ price: 699, was: 599 }), null);
});

test("nonsense is refused rather than rendered", () => {
  for (const was of [null, undefined, "699", NaN, Infinity, {}]) {
    assert.equal(saleOn({ price: 699, was }), null, `was=${String(was)} should be refused`);
  }
  assert.equal(saleOn(null), null);
  assert.equal(saleOn(undefined), null);
});

test("a product is on sale when any size is", () => {
  assert.equal(onSale({ variants: [{ price: 699 }, { price: 1199, was: 1299 }] }), true);
  assert.equal(onSale({ variants: [{ price: 699 }, { price: 1299 }] }), false);
  assert.equal(onSale({ variants: [] }), false);
  assert.equal(onSale(undefined), false);
});

test("the badge quotes the deepest reduction across sizes", () => {
  const best = bestSale({ variants: [
    { price: 649, was: 699 },   // 7%
    { price: 899, was: 1299 },  // 31%
  ] });
  assert.equal(best.percent, 31);
  assert.equal(best.was, 1299);
});

test("bestSale is null when nothing is reduced", () => {
  assert.equal(bestSale({ variants: [{ price: 699 }] }), null);
});

test("every `was` in the real catalogue is a genuine reduction", () => {
  // The guard that matters in practice: someone edits data.mjs and types a
  // `was` that is lower than the price, or equal to it. It would silently
  // not render, which is safe but confusing; this says so out loud.
  for (const p of products) {
    for (const v of p.variants) {
      if (v.was === undefined) continue;
      assert.ok(
        Number(v.was) > Number(v.price),
        `${p.id} ${v.size}: was ${v.was} is not above price ${v.price}`,
      );
    }
  }
});
