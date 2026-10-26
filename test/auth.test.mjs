/**
 * Password and session tests.
 *
 * No database: these cover the cryptographic bits, which are the ones where
 * a quiet mistake is invisible until it matters.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  hashPassword, verifyPassword, passwordProblem, newSessionToken, sha256,
  sessionCookie, clearedCookie, readCookie, SESSION_COOKIE, MIN_PASSWORD,
} from "../api/_lib/auth.mjs";

test("a correct password verifies", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
});

test("a wrong password does not", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("Correct horse battery staple", hash), false);
  assert.equal(await verifyPassword("", hash), false);
  assert.equal(await verifyPassword("correct horse battery stapl", hash), false);
});

test("the password never appears in the stored hash", async () => {
  const password = "lavender-is-my-favourite";
  const hash = await hashPassword(password);
  assert.ok(!hash.includes(password), "the password is recoverable from the hash");
});

test("the same password hashes differently every time", async () => {
  // Different salts. Without this, identical passwords are visibly identical
  // in the table, and one cracked hash breaks every account that shares it.
  const a = await hashPassword("the same password");
  const b = await hashPassword("the same password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("the same password", a), true);
  assert.equal(await verifyPassword("the same password", b), true);
});

test("the hash records its own parameters", async () => {
  // So the cost can be raised later without invalidating existing hashes.
  const hash = await hashPassword("whatever this is");
  const [scheme, N, r, p] = hash.split("$");
  assert.equal(scheme, "scrypt");
  for (const n of [N, r, p]) assert.ok(Number(n) > 0);
});

test("a corrupt or foreign hash fails closed", async () => {
  for (const bad of ["", "not-a-hash", "scrypt$$$$", "bcrypt$2a$10$abc", null, undefined]) {
    assert.equal(await verifyPassword("anything", bad), false, `${String(bad)} should not verify`);
  }
});

test("short passwords are refused, long ones are not", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("a".repeat(MIN_PASSWORD - 1)));
  assert.equal(passwordProblem("a".repeat(MIN_PASSWORD)), null);
  assert.equal(passwordProblem("a whole sentence used as a passphrase"), null);
  assert.ok(passwordProblem("a".repeat(201)), "absurd lengths should be refused");
  assert.ok(passwordProblem(12345678901), "a non-string is not a password");
});

test("session tokens are unpredictable and distinct", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(newSessionToken().token);
  assert.equal(seen.size, 500, "a token repeated");
  // 32 bytes base64url: comfortably past guessing.
  assert.ok(newSessionToken().token.length >= 40);
});

test("what we store is the hash, not the token", () => {
  const { token, tokenHash } = newSessionToken();
  assert.notEqual(token, tokenHash);
  assert.equal(tokenHash, sha256(token));
  // The point: the stored value cannot be replayed as a cookie.
  assert.notEqual(sha256(tokenHash), tokenHash);
});

test("the session cookie carries its protections", () => {
  const c = sessionCookie("abc123");
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) {
    assert.ok(c.includes(flag), `cookie is missing ${flag}`);
  }
  assert.ok(c.startsWith(`${SESSION_COOKIE}=abc123`));
});

test("logging out expires the cookie immediately", () => {
  const c = clearedCookie();
  assert.ok(c.includes("Max-Age=0"));
  assert.ok(c.includes("HttpOnly"));
});

test("reads its own cookie out of a header with others in it", () => {
  const req = { headers: { cookie: `_ga=GA1.2.3; ${SESSION_COOKIE}=the-token; other=x` } };
  assert.equal(readCookie(req, SESSION_COOKIE), "the-token");
  assert.equal(readCookie(req, "missing"), null);
  assert.equal(readCookie({ headers: {} }, SESSION_COOKIE), null);
});

test("a cookie whose name merely ends in ours is not ours", () => {
  const req = { headers: { cookie: `not_${SESSION_COOKIE}=wrong` } };
  assert.equal(readCookie(req, SESSION_COOKIE), null);
});
