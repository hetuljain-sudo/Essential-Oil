/**
 * Google Sheets, over plain fetch.
 *
 * No SDK, for the third time in this codebase and the same reason: the
 * surface needed is three REST calls and one signature, and the official
 * client is a large dependency on a path that must not break the shop.
 *
 * Authentication is a **service account** — a robot identity with its own
 * email address, rather than your Google login. You share a sheet with that
 * address exactly as you would share it with a colleague, and it can edit
 * that sheet and nothing else. No OAuth consent screen, no refresh token to
 * expire, no access to the rest of your Drive.
 *
 * The exchange is: sign a short-lived assertion with the service account's
 * private key, swap it for an access token good for an hour. RS256 via
 * node:crypto, which is the whole of what a JWT library would do here.
 *
 * ---
 *
 * **The sheet is never the source of truth.** The database is. This writes
 * the sheet to match it, header and all, every time. That is deliberate:
 * appending a row per order sounds cheaper and means a single failed call
 * leaves a permanent hole that nothing will ever notice. Rewriting is
 * idempotent — run it twice, run it after an outage, run it after editing
 * the sheet by hand, and the result is the same correct sheet.
 */

import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * The private key as PEM.
 *
 * Environment variables cannot hold real newlines in most dashboards, so the
 * key is pasted with literal \n and restored here. Getting this wrong gives
 * "error:1E08010C:DECODER routines::unsupported", which says nothing useful
 * about the cause.
 */
const privateKey = () => (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

/** What is configured, naming no secret. db/check.mjs prints this. */
export function sheetStatus() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const key = privateKey();
  const sheetId = process.env.GOOGLE_SHEET_ID ?? "";

  if (!email && !key && !sheetId) return { configured: false, reason: "nothing set" };
  if (!email.includes("@")) return { configured: false, reason: "GOOGLE_SERVICE_ACCOUNT_EMAIL is not an address" };
  if (!key.includes("BEGIN PRIVATE KEY")) {
    return { configured: false, reason: "GOOGLE_PRIVATE_KEY does not look like a PEM key" };
  }
  if (!sheetId) return { configured: false, reason: "GOOGLE_SHEET_ID is not set" };

  return { configured: true, serviceAccount: email, sheetId };
}

export const sheetConfigured = () => sheetStatus().configured;

/** The sheet's own URL, for a link in the admin page. */
export const sheetUrl = () =>
  process.env.GOOGLE_SHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`
    : null;

/**
 * An access token, good for an hour.
 *
 * Not cached. A serverless invocation rarely lives long enough to reuse one,
 * and a stale token cached across a key rotation is a confusing failure to
 * chase for the sake of one request.
 */
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    // Google rejects anything over an hour, and a short life limits what a
    // leaked assertion is worth.
    exp: now + 3600,
  }));

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(privateKey(), "base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google refused the key: ${body.error_description ?? body.error ?? res.status}`);
  }
  return body.access_token;
}

async function api(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`${SHEETS}/${process.env.GOOGLE_SHEET_ID}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = parsed?.error?.message ?? `HTTP ${res.status}`;
    // The single most common cause, and the error Google returns for it is
    // not obviously about sharing at all.
    const hint = res.status === 403 || res.status === 404
      ? ` — is the sheet shared with ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL} as an Editor?`
      : "";
    throw new Error(`${message}${hint}`);
  }
  return parsed;
}

/**
 * The first tab's name.
 *
 * Asked rather than assumed. A new sheet's tab is "Sheet1" in English and
 * something else in other locales, and writing to a range naming a tab that
 * does not exist fails with a parse error that sounds like a bug in the
 * range. One extra call removes the whole question.
 */
async function firstTabName(token) {
  const meta = await api(token, "?fields=sheets.properties.title");
  const title = meta?.sheets?.[0]?.properties?.title;
  if (!title) throw new Error("that spreadsheet has no tabs");
  return title;
}

/**
 * Make the sheet match `rows`, with `header` as the first row.
 *
 * Clears first, so an order that was deleted, or a shorter list than last
 * time, does not leave orphaned rows below the new data — which would read
 * as real orders to anyone looking.
 *
 * Returns `{ synced, rows, tab, url }`, never a bare boolean: the admin page
 * has to tell someone what actually happened.
 */
export async function syncSheet(header, rows) {
  const status = sheetStatus();
  if (!status.configured) {
    return { synced: false, reason: `Google Sheets is not configured: ${status.reason}` };
  }

  try {
    const token = await accessToken();
    const tab = await firstTabName(token);
    const range = `${tab}!A:ZZ`;

    await api(token, `/values/${encodeURIComponent(range)}:clear`, { method: "POST", body: {} });

    await api(
      token,
      `/values/${encodeURIComponent(`${tab}!A1`)}?valueInputOption=RAW`,
      { method: "PUT", body: { range: `${tab}!A1`, majorDimension: "ROWS", values: [header, ...rows] } },
    );

    return { synced: true, rows: rows.length, tab, url: sheetUrl() };
  } catch (err) {
    return { synced: false, reason: err.message };
  }
}
