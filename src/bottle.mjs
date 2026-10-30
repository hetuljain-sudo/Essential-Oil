/**
 * The generated bottle.
 *
 * Drawn in two places: the build renders it into the homepage hero and for
 * any oil without photography, and the browser renders it when a photograph
 * fails to load and the fallback swaps it in.
 *
 * It lived twice, once in each file, and the copies drifted — the build's
 * bottle grew a cap highlight, a rule under the label, the words "PURE OIL"
 * and a highlight down the shoulder, and the browser's did not. So a failed
 * image fell back to a visibly plainer bottle than the one on the homepage,
 * which is the sort of difference nobody notices until a customer sees both.
 *
 * Shared the same way redirect.mjs, csv.mjs, image.mjs and sale.mjs are: the
 * build strips the `export` keywords and prepends this file to app.js, so
 * one definition reaches both sides.
 */

/**
 * Escape for the label, deliberately local.
 *
 * Both templates.mjs and app.js already declare their own `esc`. Declaring a
 * third one with that name here would collide on the browser side, where
 * this file is prepended into the same scope as app.js — so it carries its
 * own, under a name nothing else uses.
 */
const escapeLabel = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** The one or two words that fit on a bottle label. */
export const shortLabel = (p) => p.short || p.name.split(" ")[0];

/**
 * An amber bottle in the oil's own colours.
 *
 * `key` seeds the gradient's id rather than a random number. Two bottles on
 * one page need different ids or the second reuses the first's gradient, and
 * a random id would change on every build and rewrite every file in dist.
 */
export function bottleSVG([light, dark], label = "", key = label) {
  const uid = "g-" + (String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bottle");

  return `<svg class="bottle" viewBox="0 0 80 160" aria-hidden="true" focusable="false">
    <rect x="30" y="2" width="20" height="10" rx="3" fill="#2a2a2a"/>
    <rect x="26" y="10" width="28" height="26" rx="4" fill="#1f1f1f"/>
    <rect x="29" y="14" width="3" height="18" rx="1.5" fill="#fff" opacity=".15"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="#7a3d12"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="url(#${uid})"/>
    <rect x="16" y="78" width="48" height="52" fill="${light}"/>
    <rect x="16" y="78" width="48" height="52" fill="${dark}" opacity=".35"/>
    <text x="40" y="102" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="10" font-weight="600" fill="#fff">${escapeLabel(label)}</text>
    <line x1="26" y1="110" x2="54" y2="110" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/>
    <text x="40" y="121" text-anchor="middle" font-family="Inter, sans-serif" font-size="5" letter-spacing="1" fill="#fff" opacity=".85">PURE OIL</text>
    <path d="M22 66c0-6 6-9 9-11" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="20" y="70" width="3" height="70" rx="1.5" fill="#fff" opacity=".18"/>
    <defs><linearGradient id="${uid}" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
      <stop offset=".5" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient></defs>
  </svg>`;
}
