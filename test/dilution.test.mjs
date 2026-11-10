import test from "node:test";
import assert from "node:assert/strict";

import {
  DROPS_PER_ML, VOLUMES, STRENGTHS,
  dropsFor, formatDrops, ceilingFor, phototoxicLimit, exceedsCeiling, blendFor,
} from "../src/dilution.mjs";
import { products } from "../src/data.mjs";

/* ------------------------------------------------------------- arithmetic */

test("one drop in a teaspoon is one per cent", () => {
  // The shortcut the whole page is built on. 5 ml is a teaspoon.
  assert.equal(dropsFor(5, 1), 1);
});

test("the usual case: 30 ml at 2% is twelve drops", () => {
  assert.equal(dropsFor(30, 2), 12);
});

test("doubling the carrier doubles the drops", () => {
  assert.equal(dropsFor(60, 2), dropsFor(30, 2) * 2);
});

test("doubling the strength doubles the drops", () => {
  assert.equal(dropsFor(30, 4), dropsFor(30, 2) * 2);
});

test("nothing in, nothing out", () => {
  for (const [ml, pct] of [[0, 2], [30, 0], [-30, 2], [30, -2], [NaN, 2]]) {
    assert.equal(dropsFor(ml, pct), 0, `${ml} ml at ${pct}%`);
  }
});

/* The dilution chart in src/guides.mjs was written by hand against the same
   20-drops-per-ml convention. If the two ever disagree, one of them is
   lying to someone measuring oil onto their skin, so the agreement is
   pinned here rather than left to chance. */
test("agrees with the dilution chart in the guides", () => {
  const chart = [
    { percent: 0.5, perTeaspoon: 0.5, per30ml: 3 },
    { percent: 1, perTeaspoon: 1, per30ml: 6 },
    { percent: 2, perTeaspoon: 2, per30ml: 12 },
    { percent: 3, perTeaspoon: 3, per30ml: 18 },
  ];
  for (const row of chart) {
    assert.equal(dropsFor(5, row.percent), row.perTeaspoon, `${row.percent}% per teaspoon`);
    assert.equal(dropsFor(30, row.percent), row.per30ml, `${row.percent}% per 30 ml`);
  }
});

test("drops per millilitre is the industry convention", () => {
  assert.equal(DROPS_PER_ML, 20);
  assert.equal(dropsFor(1, 100), DROPS_PER_ML);
});

/* --------------------------------------------------------------- display */

test("whole numbers read as whole numbers", () => {
  assert.equal(formatDrops(12), "12");
  assert.equal(formatDrops(12.0001), "12");
});

test("a fraction of a drop keeps one decimal", () => {
  assert.equal(formatDrops(0.5), "0.5");
  assert.equal(formatDrops(1.25), "1.3");
});

/* --------------------------------------------------------------- ceilings */

test("an oil with no ceiling reports none", () => {
  assert.equal(ceilingFor({ name: "Lavender" }), null);
  assert.equal(ceilingFor({ safety: {} }), null);
  assert.equal(ceilingFor(undefined), null);
});

test("a ceiling carries the oil's own reason, not a generic one", () => {
  const p = { safety: { maxDilution: 0.5 }, warning: "A known skin sensitiser." };
  assert.deepEqual(ceilingFor(p), { percent: 0.5, reason: "A known skin sensitiser." });
});

test("over the ceiling is over, at it is not", () => {
  const p = { safety: { maxDilution: 1 } };
  assert.equal(exceedsCeiling(p, 2), true);
  assert.equal(exceedsCeiling(p, 1), false);
  assert.equal(exceedsCeiling(p, 0.5), false);
  // An oil with no ceiling of its own is never over one.
  assert.equal(exceedsCeiling({ name: "Lavender" }, 3), false);
});

test("phototoxicity is a separate limit from the skin ceiling", () => {
  const p = { safety: { phototoxic: 0.4 } };
  assert.equal(phototoxicLimit(p), 0.4);
  assert.equal(ceilingFor(p), null, "a phototoxic limit is not a skin ceiling");
});

/* ------------------------------------------------------- against the data */

test("every ceiling in the catalogue is a sane percentage", () => {
  const withCeiling = products.filter((p) => p.safety?.maxDilution !== undefined);
  assert.ok(withCeiling.length > 0, "the catalogue should carry some ceilings");
  for (const p of withCeiling) {
    const c = ceilingFor(p);
    assert.equal(typeof c.percent, "number", p.name);
    assert.ok(c.percent > 0 && c.percent <= 5, `${p.name}: ${c.percent}%`);
  }
});

test("an oil with a ceiling says why, so the page never shows a bare number", () => {
  for (const p of products.filter((p) => p.safety?.maxDilution !== undefined)) {
    assert.ok(ceilingFor(p).reason.length > 0, `${p.name} has a ceiling but no warning text`);
  }
});

test("the offered strengths and volumes all produce a usable answer", () => {
  for (const ml of VOLUMES) {
    for (const pct of STRENGTHS) {
      const drops = dropsFor(ml, pct);
      assert.ok(drops > 0, `${ml} ml at ${pct}%`);
      assert.ok(Number.isFinite(drops), `${ml} ml at ${pct}%`);
    }
  }
});

test("under one drop is reported as impractical rather than rounded up", () => {
  // 5 ml at 0.5% is half a drop. Rounding that to 1 would double the
  // strength of the blend without telling anybody.
  const b = blendFor({ name: "Lavender" }, 5, 0.5);
  assert.equal(b.drops, 0.5);
  assert.equal(b.label, "0.5");
  assert.equal(b.practical, false);
});

test("a blend at a safe strength is practical and under the ceiling", () => {
  const b = blendFor({ safety: { maxDilution: 1 }, warning: "x" }, 30, 1);
  assert.equal(b.label, "6");
  assert.equal(b.practical, true);
  assert.equal(b.overCeiling, false);
});

test("a blend over the oil's ceiling says so", () => {
  const b = blendFor({ safety: { maxDilution: 0.5 }, warning: "x" }, 30, 2);
  assert.equal(b.overCeiling, true);
  assert.equal(b.ceiling.percent, 0.5);
});
