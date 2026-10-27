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
import { schemaExpectations } from "./schema-read.mjs";

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

// Counted against what this very file declares, so adding a table to
// schema.sql cannot leave the confirmation below quietly understating it.
const expected = schemaExpectations(source).tables;

const present = (await sql`
  select table_name from information_schema.tables where table_schema = 'public'`
).map((r) => r.table_name);

const missing = expected.filter((t) => !present.includes(t));

console.log(
  `Applied ${applied} statements. ${expected.length - missing.length} of ${expected.length} expected tables present.`,
);
if (missing.length) {
  console.error(`Missing: ${missing.join(", ")} — check the errors above.`);
  process.exit(1);
}
console.log("Next: npm run seed, then npm run db:check");
