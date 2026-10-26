/**
 * GET  /api/admin/stock               every sku with its quantity
 * POST /api/admin/stock  { sku, quantity }
 *
 * Sets a quantity outright rather than adjusting by a delta. Counting what
 * is on the shelf and typing that number is what actually happens; working
 * out the difference first is a step at which people make mistakes.
 */

import { json } from "../_lib/http.mjs";
import { requireAdmin, parseQuantity } from "../_lib/admin.mjs";
import { products } from "../../src/data.mjs";
import { skuFor } from "../../src/sku.mjs";

/** sku -> readable name, so the page does not have to decode SRV-LAVENDE-15ML. */
const names = new Map(
  products.flatMap((p) => p.variants.map((v) => [skuFor(p, v), { name: p.name, size: v.size }])),
);

export default async function handler(req, res) {
  const gate = await requireAdmin(req, res);
  if (!gate) return;
  const { sql } = gate;

  try {
    if (req.method === "GET") {
      const rows = await sql`select sku, quantity, updated_at from stock order by sku`;

      const stock = rows.map((r) => ({
        ...r,
        name: names.get(r.sku)?.name ?? r.sku,
        size: names.get(r.sku)?.size ?? "",
        // An oil removed from the catalogue keeps its row. Flag it rather
        // than hide it, or the number quietly stops meaning anything.
        orphan: !names.has(r.sku),
      }));

      const [counts] = await sql`
        select count(*) filter (where quantity = 0)::int as out_of_stock,
               count(*) filter (where quantity > 0 and quantity <= 5)::int as low
          from stock`;

      return json(res, 200, { stock, counts });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
      const { sku } = body;

      if (typeof sku !== "string" || !sku) return json(res, 400, { error: "Which sku?" });

      const { quantity, error } = parseQuantity(body.quantity);
      if (error) return json(res, 400, { error });

      const [row] = await sql`
        update stock set quantity = ${quantity}, updated_at = now()
         where sku = ${sku}
         returning sku, quantity`;

      if (!row) return json(res, 404, { error: "No such sku." });
      return json(res, 200, { ok: true, sku: row.sku, quantity: row.quantity });
    }

    res.setHeader("allow", "GET, POST");
    return json(res, 405, { error: "Use GET or POST." });
  } catch (err) {
    console.error("admin stock failed:", err);
    return json(res, 500, { error: "Something went wrong." });
  }
}
