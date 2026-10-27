/**
 * What an order costs, decided on the server.
 *
 * The browser sends what the shopper wants — product, size, quantity — and
 * nothing else. Every rupee is recomputed here from the catalogue in this
 * repository. A cart that arrives claiming lavender costs ₹1 is priced at the
 * real ₹699, because the price in the request is never read.
 *
 * Money is handled in paise as integers throughout. Rupees as floats would
 * round badly (0.1 + 0.2 is not 0.3), and Razorpay wants paise anyway.
 */

import { products, site } from "../../src/data.mjs";
import { skuFor } from "../../src/sku.mjs";

export const MAX_LINES = 20; // distinct products in one order
export const MAX_QTY_PER_LINE = 10; // per product+size

/** A fault in what the shopper sent, not in our code — safe to show them. */
export class CartError extends Error {
  constructor(message, code = "invalid_cart") {
    super(message);
    this.name = "CartError";
    this.code = code;
  }
}

export const toPaise = (rupees) => Math.round(rupees * 100);

/** sku -> { sku, productId, name, size, pricePaise, catalogueStock } */
export const catalogue = new Map(
  products.flatMap((p) =>
    p.variants.map((v) => {
      const sku = skuFor(p, v);
      return [sku, {
        sku,
        productId: p.id,
        name: p.name,
        size: v.size,
        pricePaise: toPaise(v.price),
        catalogueStock: v.stock,
      }];
    }),
  ),
);

export const skuOf = (productId, size) => {
  const p = products.find((x) => x.id === productId);
  if (!p) return null;
  const v = p.variants.find((x) => x.size === size);
  return v ? skuFor(p, v) : null;
};

/**
 * Shipping: free at or above the threshold, a flat fee below it.
 *
 * Expressed as a function of the subtotal only. If it ever grows to depend on
 * weight or destination, this is the one place that changes.
 */
export function shippingPaiseFor(subtotalPaise) {
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= toPaise(site.freeShippingAt) ? 0 : toPaise(site.shippingFlat);
}

/**
 * Turn a requested cart into priced lines and a total.
 *
 * `stock` maps sku -> quantity available and comes from the database, which is
 * the only authority on stock. The quantities in the catalogue are a seed for
 * the first deploy and a display fallback, never a reason to accept an order.
 *
 * Throws CartError on anything the shopper can fix, so the caller can answer
 * 400 with a message worth reading.
 */
export function priceCart(items, stock) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CartError("Your cart is empty.", "empty_cart");
  }
  if (items.length > MAX_LINES) {
    throw new CartError(`An order can hold at most ${MAX_LINES} different oils.`, "too_many_lines");
  }

  const seen = new Set();
  const lines = [];

  for (const item of items) {
    const { id, size, qty } = item ?? {};

    if (typeof id !== "string" || typeof size !== "string") {
      throw new CartError("That cart could not be read.");
    }
    // A number, not something that coerces to one. "2" would pass a Number()
    // check and so would "1e2", and quantities are not worth being clever
    // about — our own client always sends a number.
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) {
      throw new CartError("Quantities have to be whole numbers of at least one.");
    }
    if (qty > MAX_QTY_PER_LINE) {
      throw new CartError(`You can order up to ${MAX_QTY_PER_LINE} of any one size.`, "qty_too_high");
    }

    const sku = skuOf(id, size);
    if (!sku) throw new CartError("One of those oils is no longer available.", "unknown_item");

    // Two lines for the same sku would each pass the stock check on their own
    // and together oversell it.
    if (seen.has(sku)) throw new CartError("That cart lists the same size twice.", "duplicate_line");
    seen.add(sku);

    const entry = catalogue.get(sku);
    const available = Number.isInteger(stock?.[sku]) ? stock[sku] : 0;
    if (available < qty) {
      throw new CartError(
        available === 0
          ? `${entry.name} ${entry.size} has just sold out.`
          : `Only ${available} of ${entry.name} ${entry.size} left.`,
        "insufficient_stock",
      );
    }

    lines.push({
      sku,
      productId: entry.productId,
      name: entry.name,
      size: entry.size,
      qty,
      unitPricePaise: entry.pricePaise,
      linePaise: entry.pricePaise * qty,
    });
  }

  const subtotalPaise = lines.reduce((sum, l) => sum + l.linePaise, 0);
  const shipPaise = shippingPaiseFor(subtotalPaise);

  return {
    lines,
    subtotalPaise,
    shippingPaise: shipPaise,
    totalPaise: subtotalPaise + shipPaise,
  };
}
