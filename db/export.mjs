/**
 * A copy of everything, off the database.
 *
 *   npm run db:export                    → backups/2026-11-06T0912/
 *   npm run db:export -- --out D:/sarvha → somewhere else, ideally another disk
 *   npm run db:export -- --no-hashes     → omit password hashes
 *
 * Why this exists: there was no backup of any kind. Neon's free tier keeps a
 * short restore window and nothing else, and a database that disappears takes
 * every order, address and customer with it. A single file you can copy to a
 * drive is worth more than a plan to set one up.
 *
 * What it writes, per run, into its own timestamped folder:
 *
 *   orders.json          every order, with its items nested inside it
 *   customers.json       accounts, addresses, and the password hashes
 *   messages.json        contact form submissions
 *   subscribers.json     the newsletter list
 *   stock.json           quantities, as counted at this moment
 *   orders.csv           the same orders, openable in Excel or Sheets
 *   manifest.json        counts, totals and what was skipped
 *
 * JSON is the restorable copy; the CSV is there so the thing is useful
 * without a programmer present.
 *
 * **Three tables are deliberately not exported.** `sessions` and
 * `password_resets` hold hashes of tokens that are expiring anyway, and
 * restoring them would be restoring other people's live logins. The
 * `webhook_events` payloads are Razorpay's own copies of events Razorpay can
 * resend, and they are large enough to make a backup you stop taking.
 *
 * Reads DATABASE_URL from the environment and prints no part of it.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { neon } from "@neondatabase/serverless";
import { ordersToCsv } from "../src/csv.mjs";

/* ------------------------------------------------------------- arguments */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] ?? null;
};

const withHashes = !flag("--no-hashes");

/* The folder name sorts chronologically and carries no colons, which Windows
   refuses in a path. Down to the second, not the minute: two exports a minute
   apart is normal while you are checking one worked, and a stamp that stops
   at the minute silently overwrites the first with the second. */
const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 17);
const outDir = resolve(value("--out") ?? "backups", stamp);

/* --------------------------------------------------------------- the run */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\nDATABASE_URL is not set.\n\n" +
    "  Local: put it in .env.local — the npm script reads that file.\n" +
    "  Elsewhere: export it for this command only, so it stays out of your shell history.\n",
  );
  process.exit(1);
}

const sql = neon(url);

console.log(`\nExporting to ${outDir}`);
await mkdir(outDir, { recursive: true });

/**
 * Orders carry their items inside them rather than in a second file.
 *
 * An order and its lines are one fact — what somebody bought — and splitting
 * them across two files means a restore has to rejoin them correctly to be a
 * restore at all. Nested, the shape cannot be reassembled wrongly.
 */
const orders = await sql`
  select o.*,
         coalesce(
           json_agg(
             json_build_object(
               'sku', i.sku, 'product_id', i.product_id, 'name', i.name,
               'size', i.size, 'qty', i.qty,
               'unit_price_paise', i.unit_price_paise, 'line_paise', i.line_paise
             ) order by i.id
           ) filter (where i.id is not null),
           '[]'
         ) as items
    from orders o
    left join order_items i on i.order_id = o.id
   group by o.id
   order by o.created_at`;

/*
 * The hashes are in by default, and that is the uncomfortable but correct
 * choice: a "backup" that cannot restore anyone's login is a list of email
 * addresses, not a backup. They are scrypt hashes with per-password salts,
 * not passwords — but the file is still the most sensitive thing this script
 * produces, which is why it says so when it finishes and why `backups/` is
 * gitignored. `--no-hashes` is there for a copy you need to hand to someone.
 */
const customers = withHashes
  ? await sql`select * from customers order by created_at`
  : await sql`
      select id, email, name, phone,
             address_line1, address_line2, address_city, address_state, address_postcode,
             is_admin, created_at
        from customers order by created_at`;

const messages = await sql`select * from messages order by created_at`;
const subscribers = await sql`select * from subscribers order by created_at`;
const stock = await sql`select * from stock order by sku`;

/* ------------------------------------------------------------- the files */

const write = async (name, data) => {
  await writeFile(join(outDir, name), JSON.stringify(data, null, 2), "utf8");
  return data.length;
};

await write("orders.json", orders);
await write("customers.json", customers);
await write("messages.json", messages);
await write("subscribers.json", subscribers);
await write("stock.json", stock);

/* The same orders a second time, for a person rather than for a restore. */
await writeFile(join(outDir, "orders.csv"), ordersToCsv(orders), "utf8");

const paid = orders.filter((o) => ["paid", "shipped", "oversold"].includes(o.status));
const takenPaise = paid.reduce((sum, o) => sum + Number(o.total_paise), 0);

const manifest = {
  taken_at: new Date().toISOString(),
  tables: {
    orders: orders.length,
    order_items: orders.reduce((n, o) => n + o.items.length, 0),
    customers: customers.length,
    messages: messages.length,
    subscribers: subscribers.length,
    stock: stock.length,
  },
  orders_settled: paid.length,
  total_taken_inr: takenPaise / 100,
  password_hashes_included: withHashes,
  deliberately_not_exported: [
    "sessions — live logins, expiring anyway",
    "password_resets — short-lived tokens",
    "webhook_events — Razorpay holds these and can resend them",
  ],
};
await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

/* -------------------------------------------------------------- the news */

const row = (label, n) => console.log(`  ${String(n).padStart(6)}  ${label}`);

console.log("");
row("orders", orders.length);
row("order items", manifest.tables.order_items);
row("customers", customers.length);
row("messages", messages.length);
row("subscribers", subscribers.length);
row("stock rows", stock.length);
console.log(`\n  ₹${(takenPaise / 100).toLocaleString("en-IN")} across ${paid.length} settled orders`);

if (orders.length === 0 && customers.length === 0) {
  console.log(
    "\n  Everything came back empty. That is correct for a database nobody has\n" +
    "  ordered from yet, and it is also what a wrong DATABASE_URL looks like.\n" +
    "  `npm run db:check` will tell you which.",
  );
}

console.log(
  `\nWritten to ${outDir}\n\n` +
  (withHashes
    ? "This folder holds customer addresses and password hashes. Keep it off\n" +
      "shared drives and out of email. `backups/` is gitignored, so it will not\n" +
      "be committed by accident — but copying it somewhere else is the point of\n" +
      "taking it, and nothing protects it once it is there.\n"
    : "Password hashes were omitted, so this cannot restore anyone's login.\n"),
);
