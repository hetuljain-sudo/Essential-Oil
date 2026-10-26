/**
 * Grant or revoke admin.
 *
 *   node db/make-admin.mjs you@example.com
 *   node db/make-admin.mjs someone@example.com --revoke
 *
 * Deliberately a command you run against the database, not a button in the
 * admin page. A "make this person an admin" button is the one control whose
 * compromise hands over everything, and nobody needs it often enough to be
 * worth the risk.
 *
 * The account has to exist first: register through the site, then run this.
 */

import { db } from "../api/_lib/db.mjs";

const email = process.argv[2]?.trim().toLowerCase();
const revoke = process.argv.includes("--revoke");

if (!email || email.startsWith("--")) {
  console.error("Usage: node db/make-admin.mjs <email> [--revoke]");
  process.exit(1);
}

const sql = db();

const [row] = await sql`
  update customers set is_admin = ${!revoke}
   where email = ${email}
   returning email, name, is_admin`;

if (!row) {
  console.error(`No account with ${email}. Register it on the site first.`);
  process.exit(1);
}

console.log(
  row.is_admin
    ? `${row.name} (${row.email}) is now an admin. /admin/ is open to them.`
    : `${row.name} (${row.email}) is no longer an admin.`,
);

// Revoking does not end their sessions, but the admin check reads the flag
// on every request, so the next one fails. Nothing stays open.
