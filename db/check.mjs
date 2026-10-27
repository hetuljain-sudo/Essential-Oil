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
 * What it expects is read out of db/schema.sql rather than listed here. A
 * hardcoded list goes stale the moment a table is added, and then reports a
 * healthy database while a new table is missing — which is the exact failure
 * this script exists to prevent.
 *
 * Reads secrets from the environment and prints none of them.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { products, site } from "../src/data.mjs";
import { skuFor } from "../src/sku.mjs";
import { schemaExpectations } from "./schema-read.mjs";

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

/*
 * Email. Not a failure when absent — the site is honest about having none,
 * and says so on the admin button rather than silently doing nothing.
 */
console.log("\nEmail");
{
  const { emailStatus } = await import("../api/_lib/email.mjs");
  const status = emailStatus();
  if (status.configured) ok(`${status.provider}, sending from @${status.fromDomain}`);
  else warn(`not configured (${status.reason}) — no order confirmations, no thank-yous`);

  if (!process.env.PUBLIC_URL) {
    warn("PUBLIC_URL is not set — emails will link to site.url, which may not resolve yet");
  }
}

console.log("\nGoogle Sheet");
{
  const { sheetStatus } = await import("../api/_lib/sheets.mjs");
  const status = sheetStatus();
  if (status.configured) ok(`sheet ${status.sheetId.slice(0, 8)}… as ${status.serviceAccount}`);
  else warn(`not configured (${status.reason}) — orders are not mirrored to a sheet`);
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

const here = dirname(fileURLToPath(import.meta.url));
const { tables: expected, columns: expectedColumns } = schemaExpectations(
  await readFile(join(here, "schema.sql"), "utf8"),
);

const tables = (await sql`
  select table_name from information_schema.tables where table_schema = 'public'`
).map((r) => r.table_name);

for (const t of expected) {
  if (tables.includes(t)) ok(`table ${t}`);
  else bad(`table ${t} is missing — run: npm run db:setup`);
}

/*
 * Columns added by `alter table ... add column if not exists` after the
 * first tables were written. A database set up from an older schema.sql
 * passes the table check above and then fails at runtime on a missing
 * column: admin cannot ship without orders.shipped_at, and /admin/ cannot be
 * reached at all without customers.is_admin. One query here, or one failed
 * order there.
 */
console.log("\nColumns added after the first schema");

const heldColumns = await sql`
  select table_name, column_name from information_schema.columns
   where table_schema = 'public'`;
const haveColumn = new Set(heldColumns.map((r) => `${r.table_name}.${r.column_name}`));

if (expectedColumns.length === 0) warn("schema.sql declares no added columns — has it been edited?");

for (const [table, column] of expectedColumns) {
  if (!tables.includes(table)) continue; // already reported as a missing table
  if (haveColumn.has(`${table}.${column}`)) ok(`${table}.${column}`);
  else bad(`${table}.${column} is missing — run: npm run db:setup`);
}

/*
 * /admin/ is a flag on an ordinary account, so a database with no admin has
 * no way in and nothing on the site says why. A warning, not a failure: a
 * fresh database legitimately has none until someone registers.
 */
if (tables.includes("customers") && haveColumn.has("customers.is_admin")) {
  const [{ admins }] = await sql`
    select count(*)::int as admins from customers where is_admin = true`;
  if (admins > 0) ok(`${admins} admin account(s) — /admin/ is reachable`);
  else warn("no admin account — register on the site, then: node db/make-admin.mjs you@example.com");
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

if (tables.includes("messages") && tables.includes("subscribers")) {
  console.log("\nMessages & subscribers");

  const [m] = await sql`
    select count(*)::int as total,
           count(*) filter (where handled_at is null)::int as unhandled
      from messages`;
  ok(`${m.total} contact message(s) — ${m.unhandled} unhandled`);

  const [subs] = await sql`
    select count(*)::int as total,
           count(*) filter (where unsubscribed_at is null)::int as active
      from subscribers`;
  ok(`${subs.total} subscriber(s) — ${subs.active} still subscribed`);

  // Every signup writes an unsubscribe token and nothing consumes it. Said
  // here because the way out has to exist before anything is ever sent.
  if (subs.active) warn("no /api/unsubscribe endpoint exists — do not send marketing mail yet");
}

console.log(`\nShipping: free over ${site.currency}${site.freeShippingAt}, otherwise ${site.currency}${site.shippingFlat}`);
console.log(failures ? `\n${failures} problem(s) above.\n` : "\nAll good.\n");
process.exit(failures ? 1 : 0);
