/**
 * What db/schema.sql says the database should look like.
 *
 * Read out of the file rather than written down a second time. Both
 * db/check.mjs and db/setup.mjs want to know what tables ought to exist, and
 * every copy of that list is one that can disagree with the schema — which it
 * already had: check.mjs expected six tables while the schema created eight,
 * so a database missing `messages` reported itself healthy.
 *
 * Pure string work, no imports, so the tests can cover it with no database
 * and no node_modules.
 */

/** Strip `-- line comments` so they cannot contribute false matches. */
const uncommented = (sql) => sql.replace(/--[^\n]*/g, "");

/**
 * { tables, columns } — table names in the order declared, and the
 * [table, column] pairs added later by `alter table ... add column`.
 *
 * The columns matter as much as the tables: these were added to a schema
 * that already existed, so a database created from an earlier copy has every
 * table and still breaks at runtime on the first order an admin tries to
 * ship.
 */
export function schemaExpectations(sql) {
  const text = uncommented(sql);

  const tables = [...text.matchAll(
    /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi,
  )].map((m) => m[1].toLowerCase());

  const columns = [...text.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?([a-z_][a-z0-9_]*)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi,
  )].map((m) => [m[1].toLowerCase(), m[2].toLowerCase()]);

  return {
    tables: [...new Set(tables)],
    // A column added twice in one file is a duplicate, not two columns.
    columns: [...new Map(columns.map((c) => [c.join("."), c])).values()],
  };
}
