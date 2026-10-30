/**
 * Admin input validation.
 *
 * The guard itself needs a database, so it is not covered here. What is
 * covered is the arithmetic an admin types: a wrong quantity here silently
 * oversells or hides stock, and nothing downstream questions it.
 *
 * Imported from validate.mjs rather than admin.mjs on purpose: admin.mjs
 * reaches the database, and importing it would make these tests need
 * node_modules to check a piece of arithmetic.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { parseQuantity, parseTracking, parseResolution } from "../api/_lib/validate.mjs";

test("accepts a plain count", () => {
  assert.deepEqual(parseQuantity(0), { quantity: 0 });
  assert.deepEqual(parseQuantity(12), { quantity: 12 });
  assert.deepEqual(parseQuantity(10000), { quantity: 10000 });
});

test("zero is a real answer, not a missing one", () => {
  // Sold out is a thing an admin types on purpose; it must not be mistaken
  // for an empty field.
  const { quantity, error } = parseQuantity(0);
  assert.equal(error, undefined);
  assert.equal(quantity, 0);
});

test("refuses what is not a whole count", () => {
  for (const v of [1.5, -1, NaN, Infinity, "5", null, undefined, {}]) {
    assert.ok(parseQuantity(v).error, `${String(v)} should have been refused`);
  }
});

test("catches a slipped keystroke", () => {
  // 10001 is not a stock level anyone holds; it is a finger on the keypad.
  assert.ok(parseQuantity(100000).error);
  assert.ok(parseQuantity(10001).error);
});

test("tracking is optional and trimmed", () => {
  assert.deepEqual(parseTracking(undefined), { tracking: null });
  assert.deepEqual(parseTracking(""), { tracking: null });
  assert.deepEqual(parseTracking("   "), { tracking: null });
  assert.deepEqual(parseTracking("  AWB123456  "), { tracking: "AWB123456" });
});

test("refuses tracking that is not text or is absurd", () => {
  assert.ok(parseTracking(12345).error);
  assert.ok(parseTracking("x".repeat(200)).error);
});

test("a resolution note is optional", () => {
  // "Dealt with" is sometimes the whole truth, and forcing prose produces ".".
  assert.deepEqual(parseResolution(undefined), { note: null });
  assert.deepEqual(parseResolution(null), { note: null });
  assert.deepEqual(parseResolution(""), { note: null });
  assert.deepEqual(parseResolution("   "), { note: null });
});

test("a resolution note is kept, trimmed", () => {
  assert.deepEqual(parseResolution("  Refunded via UPI  "), { note: "Refunded via UPI" });
});

test("a resolution note refuses what is not text, or is absurd", () => {
  assert.ok(parseResolution(12345).error);
  assert.ok(parseResolution({}).error);
  assert.ok(parseResolution("x".repeat(501)).error);
  assert.equal(parseResolution("x".repeat(500)).error, undefined);
});
