/**
 * Create the tables.
 *
 *   npm run db:setup
 *
 * Applies db/schema.sql through the same driver the application uses, so
 * psql does not have to be installed — which on Windows it usually is not.
 *
 * Safe to run more than once: every statement in schema.sql is `if not
 * exists` or `add column if not exists`, so re-running it on a live database
 * adds what is missing and touches nothing else.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { db } from "../api/_lib/db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sql = db();

const source = await readFile(join(here, "schema.sql"), "utf8");

/*
 * Split on semicolons at end of line, which is enough for this file: it has
 * no functions, no dollar-quoted bodies and no semicolons inside literals.
 * If schema.sql ever grows any of those, this needs a real parser — or psql.
 */
const statements = source
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

let applied = 0;
for (const statement of statements) {
  try {
    await sql(statement);
    applied++;
  } catch (err) {
    console.error(`\nFailed on:\n${statement.slice(0, 200)}\n`);
    throw err;
  }
}

const [{ count }] = await sql`
  select count(*)::int as count from information_schema.tables
   where table_schema = 'public'
     and table_name in ('orders','order_items','stock','webhook_events','customers','sessions')`;

console.log(`Applied ${applied} statements. ${count} of 6 expected tables present.`);
if (count < 6) {
  console.error("Some tables are missing — check the errors above.");
  process.exit(1);
}
