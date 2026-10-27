/**
 * Is everything actually wired up?
 *
 *   npm run db:check
 *
 * Checks the things that are tedious to discover one failed order at a time:
 * the database answers, the tables exist, stock is seeded, the Razorpay keys
 * are present and which mode they are in, and whether the SKUs in the stock
 * table still match the catalogue.
 *
 * Reads secrets from the environment and prints none of them.
 */

import { products, site } from "../src/data.mjs";
import { skuFor } from "../src/sku.mjs";

const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => console.log(`  warn  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); failures++; };

let failures = 0;

console.log("\nEnvironment");

for (const name of ["DATABASE_URL", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]) {
  if (process.env[name]) ok(`${name} is set`);
  else bad(`${name} is missing`);
}

// Asked of the Razorpay module rather than re-derived here: one definition of
// what a test key looks like, in the file that already holds the others.
if (process.env.RAZORPAY_KEY_ID) {
  const { isTestMode, keyId } = await import("../api/_lib/razorpay.mjs");
  const id = keyId();
  if (isTestMode()) ok("Razorpay is in TEST mode — no real money can move");
  else if (id.startsWith("rzp_live")) warn("Razorpay is in LIVE mode — real cards will be charged");
  else bad("RAZORPAY_KEY_ID does not look like a Razorpay key");
}

if (!process.env.DATABASE_URL) {
  console.log("\nSkipping database checks — DATABASE_URL is not set.\n");
  process.exit(1);
}

const { db } = await import("../api/_lib/db.mjs");
const sql = db();

console.log("\nDatabase");

try {
  await sql`select 1`;
  ok("connected");
} catch (err) {
  bad(`cannot connect: ${err.message}`);
  console.log("\nNothing else can be checked without a connection.\n");
  process.exit(1);
}

const expected = ["orders", "order_items", "stock", "webhook_events", "customers", "sessions"];
const tables = (await sql`
  select table_name from information_schema.tables where table_schema = 'public'`
).map((r) => r.table_name);

for (const t of expected) {
  if (tables.includes(t)) ok(`table ${t}`);
  else bad(`table ${t} is missing — run: npm run db:setup`);
}

console.log("\nStock");

if (tables.includes("stock")) {
  const rows = await sql`select sku, quantity from stock`;
  const held = new Set(rows.map((r) => r.sku));
  const wanted = products.flatMap((p) => p.variants.map((v) => skuFor(p, v)));

  if (rows.length === 0) bad("stock table is empty — run: npm run seed");
  else ok(`${rows.length} stock rows`);

  const missing = wanted.filter((s) => !held.has(s));
  const extra = [...held].filter((s) => !wanted.includes(s));

  if (missing.length) bad(`${missing.length} catalogue SKUs have no stock row (e.g. ${missing[0]}) — run: npm run seed`);
  else if (rows.length) ok("every catalogue SKU has a stock row");

  // Not a failure: an oil removed from the catalogue leaves its row behind,
  // which is harmless and preserves the history of what it was.
  if (extra.length) warn(`${extra.length} stock rows are not in the catalogue (e.g. ${extra[0]})`);

  const out = rows.filter((r) => r.quantity === 0).length;
  if (out) warn(`${out} SKUs are at zero`);
}

if (tables.includes("orders")) {
  console.log("\nOrders");
  const [counts] = await sql`
    select count(*)::int as total,
           count(*) filter (where status = 'paid')::int as paid,
           count(*) filter (where status = 'created')::int as pending,
           count(*) filter (where status = 'oversold')::int as oversold
      from orders`;
  ok(`${counts.total} orders — ${counts.paid} paid, ${counts.pending} awaiting payment`);
  if (counts.oversold) warn(`${counts.oversold} flagged oversold and need a refund decision`);
}

console.log(`\nShipping: free over ${site.currency}${site.freeShippingAt}, otherwise ${site.currency}${site.shippingFlat}`);
console.log(failures ? `\n${failures} problem(s) above.\n` : "\nAll good.\n");
process.exit(failures ? 1 : 0);
