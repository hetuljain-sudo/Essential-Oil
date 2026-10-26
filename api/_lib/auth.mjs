/**
 * Accounts: passwords, sessions, cookies.
 *
 * Two things in here are worth stating plainly, because getting either wrong
 * is the kind of mistake that ends a small business.
 *
 * 1. We never store a password. We store a scrypt hash of it with a random
 *    per-password salt. If this database is ever copied, the attacker has a
 *    pile of hashes that cost real money to attack one at a time, not a list
 *    of credentials to try on everyone's email account.
 *
 * 2. We never store a session token either. The browser holds the token; we
 *    hold its SHA-256. A leaked database therefore cannot be used to log in
 *    as anyone, which is not true of storing the token itself.
 *
 * scrypt comes from node:crypto. Argon2id would be a slightly better choice,
 * but it is a native dependency on the one path that must never fail to
 * build, and scrypt with these parameters is thoroughly adequate here.
 */

import {
  randomBytes, scrypt as _scrypt, createHash, timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt);

// N=16384 is roughly 100ms per hash on a small serverless instance: slow
// enough to make guessing expensive, fast enough that logging in feels
// instant. Raise N, never lower it; old hashes carry their own parameters.
const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

export const SESSION_COOKIE = "sarvha_session";
export const SESSION_DAYS = 30;

/** Shortest password we accept. Length beats punctuation rules. */
export const MIN_PASSWORD = 10;

/**
 * "scrypt$N$r$p$salt$hash" — self-describing, so raising the cost later
 * does not invalidate hashes made today.
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const { N, r, p, keylen } = PARAMS;
  const key = await scrypt(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

/**
 * Check a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash: a corrupt row
 * should fail the login, not take the endpoint down.
 */
export async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, keyB64] = String(stored).split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(keyB64, "base64");
    const actual = await scrypt(password, salt, expected.length, {
      N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * A new session token.
 *
 * 32 random bytes — not a uuid, which is not promised to be unpredictable.
 * The caller sends `token` to the browser and stores `tokenHash`.
 */
export function newSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/**
 * The Set-Cookie value for a session.
 *
 * HttpOnly  — script cannot read it, so an XSS bug cannot steal the session.
 * Secure    — never sent over plain http.
 * SameSite=Lax — not attached to cross-site POSTs, which is what makes CSRF
 *             against these endpoints a non-event, while ordinary links from
 *             email still work.
 */
export function sessionCookie(token, { maxAgeSeconds = SESSION_DAYS * 86400 } = {}) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

/** Expire the cookie now. */
export const clearedCookie = () =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/**
 * The signed-in customer, or null.
 *
 * Expiry is enforced in the query rather than in JavaScript, so a clock
 * difference between the function and the database cannot extend a session.
 */
export async function currentCustomer(sql, req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;

  const [row] = await sql`
    select c.id, c.email, c.name, c.phone
      from sessions s
      join customers c on c.id = s.customer_id
     where s.token_hash = ${sha256(token)}
       and s.expires_at > now()`;

  return row ?? null;
}

/** Password rules. Deliberately short: length is the only one that pays. */
export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return `Please use at least ${MIN_PASSWORD} characters.`;
  }
  if (password.length > 200) return "That password is too long.";
  // A password equal to the email, or to the site name, is the one shape of
  // weakness worth catching without pretending to judge entropy.
  return null;
}
