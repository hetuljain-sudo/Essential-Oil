/**
 * How much oil goes in how much carrier.
 *
 * Nearly every problem people have with essential oils is a dosing problem —
 * not the wrong oil, simply too much of it. The product page already tells
 * someone to dilute; this works out what that means for the bottle in front
 * of them, at the strength they pick, for the oil they are actually looking
 * at rather than for oils in general.
 *
 * Every number here is arithmetic or comes from the catalogue. Nothing in
 * this file decides what an oil is good for, and nothing in it should: the
 * rule everywhere on this site is to describe how an oil is used and never
 * what it treats. A drop count is a measurement, not a claim.
 *
 * Shared, like redirect/csv/image/bottle: the build prepends it into app.js
 * with the `export` keywords stripped, so the page and the browser run the
 * same definitions. Two copies of this arithmetic drifting apart is exactly
 * the failure that has bitten this project before.
 */

/**
 * 20 drops to the millilitre.
 *
 * It is a convention rather than a constant — drop size varies with the
 * dropper, the oil's viscosity and the temperature — but it is the figure
 * the whole industry quotes, and it is the one the dilution chart in
 * src/guides.mjs was written against. Changing it here would silently put
 * this calculator and that chart at odds, so if it ever changes, change it
 * in both and say so.
 */
export const DROPS_PER_ML = 20;

/** The carrier volumes people actually make up, in millilitres. */
export const VOLUMES = [5, 10, 30, 50, 100];

/** The strengths worth offering. Above 3% is short-term, small-area use. */
export const STRENGTHS = [0.5, 1, 2, 3];

/**
 * Drops of essential oil for `volumeMl` of carrier at `percent`.
 *
 * Deliberately not rounded. 5 ml at 0.5% is half a drop, and half a drop is
 * not a thing you can measure — the caller needs to see that and say so,
 * rather than be handed a confident "1" that is twice the intended strength.
 */
export function dropsFor(volumeMl, percent) {
  if (!(volumeMl > 0) || !(percent > 0)) return 0;
  return (volumeMl * DROPS_PER_ML * percent) / 100;
}

/** "12", "1.5", "0.5" — a drop count a person can read. */
export function formatDrops(drops) {
  const rounded = Math.round(drops * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * The oil's own ceiling on skin, or null where it has none.
 *
 * Eight oils in the range carry one. The figure and the reason both come
 * from the product's `safety.maxDilution` and `warning`, which is what the
 * oil's own page prints, so this cannot disagree with the page it sits on.
 */
export function ceilingFor(product) {
  const max = product?.safety?.maxDilution;
  if (typeof max !== "number") return null;
  return { percent: max, reason: product.warning || "" };
}

/**
 * The phototoxic limit for skin that will see sunlight, or null.
 *
 * Kept apart from the ceiling above because it is a different rule: it
 * applies to sun-exposed skin only, and an oil can have one without the
 * other. Bergamot is the usual example — fine under clothing, a problem on
 * a forearm in daylight.
 */
export function phototoxicLimit(product) {
  const pct = product?.safety?.phototoxic;
  return typeof pct === "number" ? pct : null;
}

/** True where `percent` is above what this oil should be used at on skin. */
export function exceedsCeiling(product, percent) {
  const ceiling = ceilingFor(product);
  return !!ceiling && percent > ceiling.percent;
}

/**
 * Everything the page needs for one volume/strength pair.
 *
 * `practical` is false when the answer is under one drop. The honest advice
 * there is to make up a larger batch rather than to try to split a drop,
 * which is also what the dilution guide says.
 */
export function blendFor(product, volumeMl, percent) {
  const drops = dropsFor(volumeMl, percent);
  const ceiling = ceilingFor(product);
  return {
    drops,
    label: formatDrops(drops),
    practical: drops >= 1,
    overCeiling: exceedsCeiling(product, percent),
    ceiling,
    phototoxic: phototoxicLimit(product),
  };
}
