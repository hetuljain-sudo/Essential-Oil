/**
 * Oils on offer.
 *
 * A variant may carry `was`: the price it used to be, in rupees.
 *
 *     { size: "15 ml", price: 599, was: 699 }
 *
 * `price` is still the price. Nothing about what a customer is charged
 * changes — api/_lib/pricing.mjs reads `price` as it always did, so the
 * server keeps computing every rupee from the catalogue and a sale cannot
 * become a way to buy lavender for ₹1. `was` is display only.
 *
 * ---
 *
 * **`was` must be a price you actually charged.**
 *
 * A struck-through number that was never real is a misleading price, and
 * India's consumer-protection rules on dark patterns name exactly that
 * practice. The field is called `was`, not `mrp` or `compareAt`, because the
 * name should make the obligation obvious to whoever edits it next.
 *
 * Anything that is not a genuine reduction is ignored rather than rendered:
 * a `was` below or equal to `price` is a typo or an invention, and drawing
 * "₹699 ₹699" would be both.
 *
 * Shared with the browser the same way image.mjs is, because the shop grid
 * redraws client-side and a badge that only existed in the built HTML would
 * vanish the first time somebody filtered.
 */

/** The genuine reduction on a variant, or null. */
export function saleOn(variant) {
  if (!variant) return null;

  const price = Number(variant.price);
  const was = Number(variant.was);

  if (!Number.isFinite(price) || !Number.isFinite(was)) return null;
  if (!(was > price)) return null;

  const off = was - price;
  return {
    was,
    price,
    off,
    // Rounded for display only. Nothing is computed from this.
    percent: Math.round((off / was) * 100),
  };
}

/** True when any size of this product is reduced. */
export const onSale = (p) => (p?.variants ?? []).some((v) => saleOn(v));

/** The best percentage across a product's sizes, for a card badge. */
export function bestSale(p) {
  const sales = (p?.variants ?? []).map(saleOn).filter(Boolean);
  if (!sales.length) return null;
  return sales.reduce((a, b) => (b.percent > a.percent ? b : a));
}
