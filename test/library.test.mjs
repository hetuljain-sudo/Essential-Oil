/**
 * The oil library rotation.
 *
 * The homepage says: "Five of our 50 oils, changing every day — never the
 * same two days running."
 *
 * That is a promise to a visitor, so it is tested rather than assumed. It
 * held when it was written; what these tests defend against is somebody
 * shortening the library later and turning the sentence into a lie without
 * touching the sentence.
 *
 * It said "No two days repeat" until it was checked — five a day stepping by
 * five through fifty entries brings a set round again every ten days, so
 * only the consecutive-day part was ever true.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { libraryFor, libraryDay } from "../src/templates.mjs";
import { library } from "../src/data.mjs";

const idsOn = (day) => libraryFor(day).map((e) => e.id);

test("shows five oils", () => {
  assert.equal(libraryFor(0).length, 5);
  assert.equal(libraryFor(12345).length, 5);
});

test("never shows the same oil two days running", () => {
  // The claim on the homepage, over nearly three years in both directions.
  for (let day = -500; day < 500; day++) {
    const today = new Set(idsOn(day));
    const overlap = idsOn(day + 1).filter((id) => today.has(id));
    assert.equal(overlap.length, 0,
      `day ${day} and ${day + 1} share ${overlap.join(", ")}`);
  }
});

test("the library is long enough for that claim to be possible", () => {
  // Five today and five tomorrow cannot be disjoint in fewer than ten
  // entries. If the library is ever cut below this, the homepage sentence
  // has to change with it — which is the point of this test.
  assert.ok(library.length >= 10,
    `library is ${library.length} entries; "never the same two days running" cannot hold below 10`);
});

test("a day always yields the same five", () => {
  // No randomness: the build and the browser compute this independently and
  // must agree, or the page would flicker to a different set on load.
  assert.deepEqual(idsOn(9321), idsOn(9321));
});

test("every entry appears, none is stranded", () => {
  // Across one full cycle each oil should get its turn, or some would never
  // be shown at all.
  const seen = new Set();
  for (let day = 0; day < library.length; day++) idsOn(day).forEach((id) => seen.add(id));
  assert.equal(seen.size, library.length);
});

test("the rotation turns on an Indian day boundary", () => {
  // 18:29 UTC is 23:59 IST the same day; 18:30 UTC is midnight IST the next.
  const lateEvening = Date.UTC(2026, 9, 29, 18, 29);
  const justAfterMidnight = Date.UTC(2026, 9, 29, 18, 30);
  assert.equal(libraryDay(justAfterMidnight) - libraryDay(lateEvening), 1);
});

test("negative days are handled, not left as a negative index", () => {
  // libraryDay is epoch-based so this cannot happen in practice, but the
  // modulo is written to cope and a silent `undefined` entry would render
  // as a blank column.
  for (const day of [-1, -7, -1000]) {
    assert.equal(libraryFor(day).filter(Boolean).length, 5, `day ${day}`);
  }
});
