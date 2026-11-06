/**
 * Grant or revoke admin.
 *
 *   npm run admin -- someone@example.com
 *   npm run admin -- someone@example.com --revoke
 *
 * Through npm because DATABASE_URL lives in .env.local, and plain `node`
 * does not read it — the bare `node db/make-admin.mjs` this file used to
 * document fails with "DATABASE_URL is not set" on the machine it was
 * written for.
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
  console.error("Usage: npm run admin -- <email> [--revoke]");
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
    ? `${row.name} (${row.email}) is now an admin.

  They can see every order, every customer's name, address and phone number,
  every contact message, and download the lot as a spreadsheet. They can also
  change stock and mark orders dispatched.

  Take it back with --revoke; it applies on their very next request.`
    : `${row.name} (${row.email}) is no longer an admin.`,
);

// Revoking does not end their sessions, but the admin check reads the flag
// on every request, so the next one fails. Nothing stays open.
