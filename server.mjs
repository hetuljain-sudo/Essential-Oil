/**
 * The whole site as one long-running server.
 *
 *   npm start
 *
 * Vercel runs each file in api/ as its own serverless function and serves
 * dist/ from a CDN, with nothing to write. Railway runs one process instead,
 * so that arrangement has to exist somewhere — this is it.
 *
 * The endpoints themselves are untouched. Eleven of the twelve are ordinary
 * `(req, res)` handlers using only `req.method`, `req.body`, `req.headers`
 * and `res.status` / `res.setHeader` / `res.end`, every one of which Express
 * provides with the same meaning. The twelfth is the webhook, which takes a
 * Web `Request` and is adapted below.
 *
 * Nothing here is Railway-specific, and api/ keeps working on Vercel
 * unchanged. This file is an alternative way to run the same code, not a
 * replacement for the other one.
 */

import express from "express";
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const app = express();

// Railway terminates TLS in front of us, so the client's real protocol and
// address arrive in X-Forwarded-*. Without this, `Secure` cookies look
// wrong to Express and req.ip is the proxy's address, not the visitor's.
app.set("trust proxy", 1);

// Vercel sets this through vercel.json. Search engines should not index an
// endpoint, and the pages carry their own robots meta.
app.use("/api", (req, res, next) => {
  res.setHeader("x-robots-tag", "noindex");
  next();
});

/* ----------------------------------------------------------- the webhook
 *
 * Mounted before the JSON body parser, and deliberately so.
 *
 * The signature is an HMAC over the exact bytes Razorpay sent. Parsing the
 * body to JSON and re-serialising it changes key order and whitespace, the
 * signature stops matching, and every real payment then looks like a
 * forgery. `express.raw` keeps the bytes; `express.json` would destroy them.
 *
 * api/razorpay-webhook.js takes a Web `Request` and returns a `Response` —
 * the shape it needs on Vercel to get those same bytes. Rather than fork it,
 * this builds one Request from what Express received and writes the Response
 * back out, so one file serves both hosts.
 */
const webhook = (await import("./api/razorpay-webhook.js")).default;

app.post(
  "/api/razorpay-webhook",
  express.raw({ type: "*/*", limit: "1mb" }),
  async (req, res, next) => {
    try {
      // req.body is a Buffer here. If no raw body arrived it is an empty
      // object, and an empty payload must still reach the signature check
      // rather than throw on the way.
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

      const request = new Request(`https://${req.headers.host ?? "localhost"}${req.originalUrl}`, {
        method: "POST",
        headers: req.headers,
        body: raw,
        duplex: "half",
      });

      const response = await webhook(request);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      next(err);
    }
  },
);

/* ---------------------------------------------------------- the endpoints */

app.use(express.json({ limit: "1mb" }));

/** api/auth/login.js -> /api/auth/login */
async function* endpointFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // _lib holds shared modules, not endpoints. Mounting them would
      // publish internal functions at a URL.
      if (entry.name.startsWith("_")) continue;
      yield* endpointFiles(full);
    } else if (entry.name.endsWith(".js")) {
      yield full;
    }
  }
}

const mounted = [];

for await (const file of endpointFiles(join(here, "api"))) {
  const route = "/api/" + relative(join(here, "api"), file)
    .split(sep).join("/")
    .replace(/\.js$/, "");

  if (route === "/api/razorpay-webhook") continue; // already mounted above

  // pathToFileURL, not the bare path. ESM refuses an absolute Windows path
  // outright — "C:\..." parses as a URL with scheme "c:" — so importing a
  // path read from the filesystem has to go through a file:// URL. It fails
  // identically for every endpoint, so the server did not start at all.
  const handler = (await import(pathToFileURL(file).href)).default;
  if (typeof handler !== "function") {
    console.warn(`skipping ${route}: no default export`);
    continue;
  }

  // `all`, not `get`/`post`: the handlers decide for themselves which
  // methods they accept and answer 405 with an Allow header. Routing only
  // the verbs we guessed would turn that into a 404 instead.
  app.all(route, (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  });
  mounted.push(route);
}

/* -------------------------------------------------------------- the site */

const dist = join(here, "dist");

app.use(express.static(dist, {
  extensions: ["html"],
  // Every asset carries a content hash in its query string, so a long cache
  // is safe for them. HTML must not be cached that way or a deploy would
  // take a day to become visible.
  setHeaders(res, path) {
    if (path.endsWith(".html")) res.setHeader("cache-control", "no-cache");
    else res.setHeader("cache-control", "public, max-age=3600");
  },
}));

// Anything left is a page we do not have. The built 404 is a real page with
// the site's navigation on it, so it is served rather than a bare string —
// with the status code that actually says what happened.
app.use((req, res) => {
  res.status(404).sendFile(join(dist, "404.html"));
});

// Express 5 routes a thrown error here. Say nothing about our internals; the
// log is where the detail belongs.
app.use((err, req, res, _next) => {
  console.error(`unhandled error on ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return;
  res.status(500);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: "Something went wrong." }));
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`\nSarvha on http://localhost:${port}`);
  console.log(`${mounted.length + 1} endpoints mounted, static site from dist/`);
  if (!process.env.DATABASE_URL) {
    console.log("\nNo DATABASE_URL — pages will serve, every /api/ route will fail.");
  }
  console.log("");
});
