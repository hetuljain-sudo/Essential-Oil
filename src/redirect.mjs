/**
 * Where a `?next=` parameter is allowed to send someone.
 *
 * Checkout sends logged-out shoppers to the login page and wants them back
 * afterwards, which means a destination in the URL, which means an open
 * redirect unless it is checked. An open redirect on this domain would let
 * anyone hand out a sarvha.com link that quietly lands somewhere else — the
 * shape of every convincing phishing link.
 *
 * Only a path on this site is allowed. Anything else falls back.
 */
export function safeNext(next, fallback = "/account/") {
  if (typeof next !== "string" || next === "") return fallback;

  // Must be site-relative.
  if (!next.startsWith("/")) return fallback;

  // "//evil.com" is a protocol-relative URL: a browser reads it as absolute.
  // "/\evil.com" is treated the same way by some browsers.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;

  // A backslash or control character anywhere invites parser disagreements
  // between what we check and what the browser does.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

  return next;
}
