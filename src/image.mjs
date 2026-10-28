/**
 * Responsive image sources.
 *
 * Shared, because a product card is built twice: once by src/templates.mjs
 * for the HTML that ships, and again by src/assets/app.js when the shop grid
 * re-renders after filtering or when live stock arrives. Two copies of the
 * same markup is how the first version of this shipped a srcset on the built
 * page and none on the one the browser actually drew.
 *
 * Prepended to app.js by the build with its exports stripped, the same way
 * redirect.mjs and csv.mjs are, so both sides read one definition.
 */

/** The widths offered. Enough steps to matter, few enough to stay cacheable. */
export const IMAGE_WIDTHS = [400, 600, 900, 1200];

/**
 * A srcset attribute, when the host can resize for us.
 *
 * Unsplash serves any width from a `w=` query parameter, so one photo can be
 * offered at four sizes for the cost of rewriting a string. Anything else —
 * a self-hosted file one day — gets no srcset at all, rather than four URLs
 * that return identical bytes and waste the browser's time choosing between
 * them.
 *
 * Returns the whole attribute including its leading space, or "", so the
 * caller can drop it into a template without worrying which.
 */
export function srcsetFor(src) {
  if (typeof src !== "string") return "";
  if (!/images\.unsplash\.com/.test(src) || !/[?&]w=\d+/.test(src)) return "";

  const set = IMAGE_WIDTHS
    .map((w) => `${src.replace(/([?&]w=)\d+/, `$1${w}`)} ${w}w`)
    .join(", ");

  return ` srcset="${set}"`;
}
