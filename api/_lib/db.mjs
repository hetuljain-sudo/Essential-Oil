/**
 * Database access.
 *
 * Neon's serverless driver speaks Postgres over HTTP, which is what makes it
 * usable from a function that may be cold-started per request — a normal TCP
 * pool would open a connection per invocation and exhaust the server.
 *
 * `sql` is a tagged template. Values interpolated into it are sent as bound
 * parameters, not spliced into the statement, so `sql`select ... ${email}``
 * is not an injection. Never build a query by string concatenation here.
 */

import { neon } from "@neondatabase/serverless";

let _sql;

export function db() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in, " +
      "or add it to the project's environment variables in your host's dashboard.",
    );
  }
  _sql = neon(url);
  return _sql;
}

/** sku -> quantity, for every sku we hold. */
export async function stockMap() {
  const rows = await db()`select sku, quantity from stock`;
  return Object.fromEntries(rows.map((r) => [r.sku, r.quantity]));
}
