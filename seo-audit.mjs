/**
 * SEO audit over the built site.
 *
 *   node seo-audit.mjs
 *
 * Checks the things that are cheap to get wrong and expensive to notice late:
 * title and description length, heading structure, canonical and social tags,
 * image alt text, structured data, and whether referenced assets exist.
 */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("find dist -name '*.html'").toString().trim().split("\n");
const issues = [];
const add = (page, kind, detail) => issues.push({ page, kind, detail });

const decode = (s) => String(s)
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const get = (html, re) => { const m = html.match(re); return m ? decode(m[1]) : undefined; };

let stats = { titles: [], descs: [], schemaTypes: new Map() };

for (const file of files) {
  const page = file.replace(/^dist/, "").replace(/index\.html$/, "") || "/";
  const html = readFileSync(file, "utf8");
  // A noindex page is not a search result, so the result-shape rules don't apply.
  const noindex = /content="noindex/.test(html);
  if (noindex) continue;

  // --- title ---
  const title = get(html, /<title>([^<]*)<\/title>/);
  if (!title) add(page, "title", "missing");
  else {
    stats.titles.push(title.length);
    if (title.length > 60) add(page, "title", `${title.length} chars (>60, will truncate)`);
    if (title.length < 25) add(page, "title", `${title.length} chars (<25, thin)`);
  }

  // --- meta description ---
  const desc = get(html, /<meta name="description" content="([^"]*)"/);
  if (!desc) add(page, "description", "missing");
  else {
    stats.descs.push(desc.length);
    if (desc.length > 160) add(page, "description", `${desc.length} chars (>160, will truncate)`);
    if (desc.length < 70) add(page, "description", `${desc.length} chars (<70, thin)`);
  }

  // --- canonical ---
  if (!/rel="canonical"/.test(html)) add(page, "canonical", "missing");

  // --- lang ---
  const lang = get(html, /<html lang="([^"]*)"/);
  if (!lang) add(page, "lang", "missing");

  // --- headings ---
  const h1s = [...html.matchAll(/<h1[^>]*>/g)].length;
  if (h1s === 0) add(page, "h1", "no h1");
  if (h1s > 1) add(page, "h1", `${h1s} h1 elements`);

  // --- social ---
  for (const tag of ["og:title", "og:description", "og:url", "og:type"]) {
    if (!html.includes(`property="${tag}"`)) add(page, "opengraph", `missing ${tag}`);
  }
  const ogImg = get(html, /<meta property="og:image" content="([^"]*)"/);
  if (!ogImg) add(page, "opengraph", "missing og:image");
  else if (ogImg.startsWith("https://sarvha.com/")) {
    const local = "dist" + ogImg.replace("https://sarvha.com", "");
    if (!existsSync(local)) add(page, "opengraph", `og:image 404s — ${ogImg}`);
  }

  // --- images ---
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\balt="/.test(tag)) add(page, "image", "img without alt");
    else if (/\balt=""/.test(tag)) add(page, "image", "img with empty alt");
    if (!/\bwidth="/.test(tag) || !/\bheight="/.test(tag)) {
      add(page, "image", "img without width/height (layout shift risk)");
    }
  }

  // --- structured data ---
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) add(page, "schema", "no structured data");
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b[1]); }
    catch { add(page, "schema", "invalid JSON-LD"); continue; }
    const nodes = data["@graph"] || [data];
    for (const n of nodes) {
      const t = n["@type"];
      stats.schemaTypes.set(t, (stats.schemaTypes.get(t) || 0) + 1);
      if (t === "Product") {
        if (!n.brand) add(page, "schema", "Product missing brand");
        if (!n.sku && !n.mpn) add(page, "schema", "Product missing sku");
        if (!n.image) add(page, "schema", "Product missing image");
        // offers may be a list, or an AggregateOffer wrapping a list
        const raw = n.offers;
        const offers = Array.isArray(raw) ? raw : raw?.offers ?? (raw ? [raw] : []);
        if (!offers.length) add(page, "schema", "Product with no offers");
        for (const o of offers) {
          if (!o.priceValidUntil) add(page, "schema", "Offer missing priceValidUntil");
          if (!o.hasMerchantReturnPolicy) add(page, "schema", "Offer missing return policy");
          if (!o.shippingDetails) add(page, "schema", "Offer missing shipping details");
          if (!o.sku) add(page, "schema", "Offer missing sku");
        }
      }
    }
  }
  if (!/BreadcrumbList/.test(html) && page !== "/" && page !== "/404.html") {
    add(page, "schema", "no BreadcrumbList");
  }
}

// --- site-wide ---
if (!existsSync("dist/robots.txt")) add("(site)", "robots", "robots.txt missing");
if (!existsSync("dist/sitemap.xml")) add("(site)", "sitemap", "sitemap.xml missing");
else {
  const sm = readFileSync("dist/sitemap.xml", "utf8");
  if (!sm.includes("<lastmod>")) add("(site)", "sitemap", "no lastmod dates");
}

// --- report ---
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
console.log(`Pages: ${files.length}`);
console.log(`Title length  — avg ${avg(stats.titles)}, max ${Math.max(...stats.titles)}`);
console.log(`Description   — avg ${avg(stats.descs)}, max ${Math.max(...stats.descs)}`);
console.log(`Schema types  — ${[...stats.schemaTypes].map(([t, n]) => `${t}:${n}`).join(", ")}`);
console.log();

const byKind = new Map();
for (const i of issues) {
  if (!byKind.has(i.kind)) byKind.set(i.kind, new Map());
  const m = byKind.get(i.kind);
  m.set(i.detail, (m.get(i.detail) || 0) + 1);
}

if (!issues.length) console.log("No issues found.");
else {
  console.log(`${issues.length} issues:\n`);
  for (const [kind, details] of [...byKind].sort((a, b) => b[1].size - a[1].size)) {
    console.log(kind.toUpperCase());
    for (const [detail, n] of [...details].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)} × ${detail}`);
    }
  }
}
