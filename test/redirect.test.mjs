/**
 * The `?next=` guard.
 *
 * Checkout sends logged-out shoppers to log in and wants them back, so the
 * destination travels in the URL. Every case below is a way of writing
 * "somewhere else entirely" that a careless check would wave through.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { safeNext } from "../src/redirect.mjs";

test("keeps an ordinary path on this site", () => {
  assert.equal(safeNext("/checkout/"), "/checkout/");
  assert.equal(safeNext("/oils/lavender-fields/"), "/oils/lavender-fields/");
  assert.equal(safeNext("/shop/?sort=price"), "/shop/?sort=price");
});

test("falls back when there is nothing to go on", () => {
  assert.equal(safeNext(null), "/account/");
  assert.equal(safeNext(undefined), "/account/");
  assert.equal(safeNext(""), "/account/");
  assert.equal(safeNext(42), "/account/");
  assert.equal(safeNext("/checkout/", "/somewhere/"), "/checkout/");
  assert.equal(safeNext("", "/somewhere/"), "/somewhere/");
});

test("refuses to send anyone off this site", () => {
  const elsewhere = [
    "https://evil.example",
    "http://evil.example",
    "//evil.example",            // protocol-relative: the browser reads it as absolute
    "/\\evil.example",           // some browsers normalise the backslash to a slash
    "\\\\evil.example",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "mailto:someone@example.com",
  ];
  for (const next of elsewhere) {
    assert.equal(safeNext(next), "/account/", `${next} should not have been followed`);
  }
});

test("refuses control characters used to confuse parsers", () => {
  assert.equal(safeNext("/checkout/\nSet-Cookie: x=y"), "/account/");
  assert.equal(safeNext("/checkout/\r\n"), "/account/");
  assert.equal(safeNext("/check\u0000out/"), "/account/");
});

test("a path that merely mentions a host is still just a path", () => {
  // Genuinely relative, so genuinely fine.
  assert.equal(safeNext("/search?q=https://evil.example"), "/search?q=https://evil.example");
});
