/**
 * GET /api/stock
 *
 * Live quantities, so the shop can grey out what has sold since the last
 * deploy. The catalogue's own stock numbers are only a seed and a fallback.
 *
 * Public and uninteresting: it says what is on the shelf, which anyone can
 * work out by trying to buy things.
 */

import { stockMap } from "./_lib/db.mjs";
import { json, methodGuard } from "./_lib/http.mjs";

export default async function handler(req, res) {
  if (!methodGuard(req, res, "GET")) return;

  try {
    const stock = await stockMap();
    // A few seconds of CDN caching absorbs a burst of page loads without
    // letting a sold-out oil look available for long.
    res.setHeader("cache-control", "public, max-age=0, s-maxage=10, stale-while-revalidate=30");
    res.status(200);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ stock }));
  } catch (err) {
    console.error("stock lookup failed:", err);
    // The shop still works without this; it falls back to the built-in
    // numbers rather than showing an error.
    return json(res, 503, { error: "Stock is unavailable right now." });
  }
}
