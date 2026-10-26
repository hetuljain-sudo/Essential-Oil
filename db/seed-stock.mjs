/**
 * Seed the stock table from the catalogue.
 *
 *   node db/seed-stock.mjs          # insert anything missing, leave the rest
 *   node db/seed-stock.mjs --reset  # also reset existing rows to catalogue
 *
 * Without --reset this is safe to run after adding oils: rows already in the
 * table keep whatever quantity they have, because by then the database knows
 * better than the catalogue does.
 */

import { products } from "../src/data.mjs";
import { skuFor } from "../src/sku.mjs";
import { db } from "../api/_lib/db.mjs";

const reset = process.argv.includes("--reset");
const sql = db();

let inserted = 0;
let updated = 0;

for (const p of products) {
  for (const v of p.variants) {
    const sku = skuFor(p, v);
    const rows = reset
      ? await sql`
          insert into stock (sku, product_id, size, quantity)
          values (${sku}, ${p.id}, ${v.size}, ${v.stock})
          on conflict (sku) do update
            set quantity = excluded.quantity, updated_at = now()
          returning (xmax = 0) as is_insert`
      : await sql`
          insert into stock (sku, product_id, size, quantity)
          values (${sku}, ${p.id}, ${v.size}, ${v.stock})
          on conflict (sku) do nothing
          returning sku`;

    if (reset) rows[0]?.is_insert ? inserted++ : updated++;
    else if (rows.length) inserted++;
  }
}

console.log(
  reset
    ? `Seeded stock: ${inserted} new, ${updated} reset to catalogue quantities.`
    : `Seeded stock: ${inserted} new. Existing rows left alone (use --reset to overwrite).`,
);
