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
function safeNext(next, fallback = "/account/") {
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

/**
 * Orders as a spreadsheet.
 *
 * CSV rather than a real .xlsx: Excel opens it natively, Google Sheets opens
 * it, and it needs no library on either side. An .xlsx would mean a
 * dependency and a binary format, to produce a file that opens the same way.
 *
 * Two things here are not decoration.
 *
 * **The BOM.** Excel on Windows reads a CSV as the system codepage unless the
 * file starts with a UTF-8 byte order mark. Without it, ₹ becomes â‚¹ and an
 * Indian name with any accent is mangled. One invisible character is the
 * difference between a usable file and a support question.
 *
 * **Formula injection.** A cell whose text begins `=`, `+`, `-` or `@` is run
 * as a formula when the file is opened. Customer names and addresses are
 * typed by strangers, so `=HYPERLINK(...)` in a delivery address would
 * execute on your machine when you open your own orders. Those values are
 * prefixed with an apostrophe, which Excel strips on display and which stops
 * it being a formula.
 *
 * Money is written as plain numbers in rupees, not "₹778", so a column can be
 * summed without cleaning it first.
 */

/** Characters Excel and Sheets treat as the start of a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One field, safe to place in a CSV.
 *
 * Text is always quoted. Unquoted text is legal, but a name containing a
 * comma, a quote or a newline then breaks the row, and quoting all of it
 * costs two bytes per field and removes the whole class of problem. Numbers
 * are the exception, and the comment below says why.
 */
function csvField(value) {
  if (value === null || value === undefined) return '""';

  // A number goes in bare. Quoted, it is a string that merely looks numeric,
  // and whether a spreadsheet converts it back depends on the application and
  // the locale — which is a poor thing to stake a Total column on. Bare, it is
  // unambiguously a number everywhere. Nothing else is written unquoted.
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  let text = String(value);
  if (FORMULA_START.test(text)) text = "'" + text;

  return '"' + text.replace(/"/g, '""') + '"';
}

/** Rows of values to CSV text. CRLF, because that is what Excel expects. */
function toCsv(rows) {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

const CSV_BOM = "﻿";

/** paise -> a number in rupees, for a cell that will be summed. */
const rupees = (paise) => Number(paise ?? 0) / 100;

/**
 * An ISO date, which sorts correctly in a spreadsheet.
 *
 * "27 Oct 2026" reads better and sorts as text, putting April before
 * January. A column of dates that cannot be sorted is worse than an ugly one.
 */
const isoDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const ORDER_COLUMNS = [
  "Order ID", "Date", "Status", "Customer", "Phone", "Email",
  "Address", "City", "State", "PIN",
  "Items", "Subtotal", "Shipping", "Total",
  "Tracking", "Dispatched", "Notes",
];

/**
 * One row per order, with the items collapsed into a single cell.
 *
 * Deliberately not one row per item. This file is for packing parcels and
 * for the accounts — both of which think in orders — and an order split over
 * three rows is counted three times by anyone summing the Total column.
 */
function ordersToRows(orders) {
  return orders.map((o) => {
    const items = (Array.isArray(o.items) ? o.items : [])
      .map((i) => `${i.qty}x ${i.name} ${i.size}`)
      .join("; ");

    return [
      o.id,
      isoDate(o.created_at),
      o.status,
      o.customer_name,
      o.customer_phone,
      o.customer_email,
      [o.address_line1, o.address_line2].filter(Boolean).join(", "),
      o.address_city,
      o.address_state,
      o.address_postcode,
      items,
      rupees(o.subtotal_paise),
      rupees(o.shipping_paise),
      rupees(o.total_paise),
      o.tracking ?? "",
      isoDate(o.shipped_at),
      o.notes ?? "",
    ];
  });
}

/** The whole file, BOM included, ready to download. */
function ordersToCsv(orders) {
  return CSV_BOM + toCsv([ORDER_COLUMNS, ...ordersToRows(orders)]);
}

/** sarvha-orders-2026-10-27.csv */
function ordersFilename(now = new Date()) {
  return `sarvha-orders-${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * Responsive image sources.
 *
 * Shared, because a product card is built twice: once by src/templates.mjs
 * for the HTML that ships, and again by src/assets/app.js when the shop grid
 * re-renders after filtering or when live stock arrives. Two copies of the
 * same markup is how the first version of this shipped a srcset on the built
 * page and none on the one the browser actually drew.
 *
 * Prepended to app.js by the build with its exports stripped, the same way
 * redirect.mjs and csv.mjs are, so both sides read one definition.
 */

/** The widths offered. Enough steps to matter, few enough to stay cacheable. */
const IMAGE_WIDTHS = [400, 600, 900, 1200];

/**
 * A srcset attribute, when the host can resize for us.
 *
 * Unsplash serves any width from a `w=` query parameter, so one photo can be
 * offered at four sizes for the cost of rewriting a string. Anything else —
 * a self-hosted file one day — gets no srcset at all, rather than four URLs
 * that return identical bytes and waste the browser's time choosing between
 * them.
 *
 * Returns the whole attribute including its leading space, or "", so the
 * caller can drop it into a template without worrying which.
 */
function srcsetFor(src) {
  if (typeof src !== "string") return "";
  if (!/images\.unsplash\.com/.test(src) || !/[?&]w=\d+/.test(src)) return "";

  const set = IMAGE_WIDTHS
    .map((w) => `${src.replace(/([?&]w=)\d+/, `$1${w}`)} ${w}w`)
    .join(", ");

  return ` srcset="${set}"`;
}

/**
 * The generated bottle.
 *
 * Drawn in two places: the build renders it into the homepage hero and for
 * any oil without photography, and the browser renders it when a photograph
 * fails to load and the fallback swaps it in.
 *
 * It lived twice, once in each file, and the copies drifted — the build's
 * bottle grew a cap highlight, a rule under the label, the words "PURE OIL"
 * and a highlight down the shoulder, and the browser's did not. So a failed
 * image fell back to a visibly plainer bottle than the one on the homepage,
 * which is the sort of difference nobody notices until a customer sees both.
 *
 * Shared the same way redirect.mjs, csv.mjs, image.mjs and sale.mjs are: the
 * build strips the `export` keywords and prepends this file to app.js, so
 * one definition reaches both sides.
 */

/**
 * Escape for the label, deliberately local.
 *
 * Both templates.mjs and app.js already declare their own `esc`. Declaring a
 * third one with that name here would collide on the browser side, where
 * this file is prepended into the same scope as app.js — so it carries its
 * own, under a name nothing else uses.
 */
const escapeLabel = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** The one or two words that fit on a bottle label. */
const shortLabel = (p) => p.short || p.name.split(" ")[0];

/**
 * An amber bottle in the oil's own colours.
 *
 * `key` seeds the gradient's id rather than a random number. Two bottles on
 * one page need different ids or the second reuses the first's gradient, and
 * a random id would change on every build and rewrite every file in dist.
 */
function bottleSVG([light, dark], label = "", key = label) {
  const uid = "g-" + (String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bottle");

  return `<svg class="bottle" viewBox="0 0 80 160" aria-hidden="true" focusable="false">
    <rect x="30" y="2" width="20" height="10" rx="3" fill="#2a2a2a"/>
    <rect x="26" y="10" width="28" height="26" rx="4" fill="#1f1f1f"/>
    <rect x="29" y="14" width="3" height="18" rx="1.5" fill="#fff" opacity=".15"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="#7a3d12"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="url(#${uid})"/>
    <rect x="16" y="78" width="48" height="52" fill="${light}"/>
    <rect x="16" y="78" width="48" height="52" fill="${dark}" opacity=".35"/>
    <text x="40" y="102" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="10" font-weight="600" fill="#fff">${escapeLabel(label)}</text>
    <line x1="26" y1="110" x2="54" y2="110" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/>
    <text x="40" y="121" text-anchor="middle" font-family="Inter, sans-serif" font-size="5" letter-spacing="1" fill="#fff" opacity=".85">PURE OIL</text>
    <path d="M22 66c0-6 6-9 9-11" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="20" y="70" width="3" height="70" rx="1.5" fill="#fff" opacity=".18"/>
    <defs><linearGradient id="${uid}" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
      <stop offset=".5" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient></defs>
  </svg>`;
}

/**
 * Shared behaviour for every page: cart drawer, mobile menu, shop filtering,
 * and the product page's size/quantity picker.
 *
 * Catalog data is injected by the build as window.CATALOG (see build.mjs),
 * so the cart can render a line for a product whose page you aren't on.
 */

const C = window.CATALOG || { products: [], categories: [], currency: "₹", locale: "en-IN", freeShippingAt: 999 };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
/*
 * Whole rupees show bare; anything with paise in it shows both digits.
 *
 * Without the second case a fractional amount renders as "₹708.1", which
 * reads as a broken price rather than as seven hundred and eight rupees ten
 * paise. Nothing in the catalogue is fractional, so this never came up until
 * discount codes could produce one.
 */
const money = (n) => C.currency + n.toLocaleString(C.locale, Number.isInteger(n)
  ? undefined
  : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const byId = (id) => C.products.find((p) => p.id === id);
const catLabel = (id) => (C.categories.find((c) => c.id === id) || { label: id }).label;
const smallestPack = (p) => p.variants[0];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/**
 * A drawn bottle, used where an oil has no photograph.
 *
 * `key` names this bottle within the page and decides the gradient's id.
 * It was Math.random(), which made every build rewrite all 68 dist files
 * with no real change and buried genuine diffs in the noise. It also meant
 * the server and the client produced different markup for the same card.
 *
 * The id only has to be unique within a document, so callers pass something
 * stable and distinct — a product id, or a cart key where one product can
 * appear twice at different sizes.
 */
/**
 * Photography that fails to load is replaced with generated bottle art.
 *
 * Replaces the stub defined in the document head, which exists only to catch
 * failures that happen before this file has run, and drains whatever it
 * caught. Without that pair, an image that failed early fired onerror
 * against nothing and stayed broken.
 */
window.artFallback = function (img) {
  const p = byId(img.dataset.pid);
  const holder = img.parentElement;
  img.remove();
  if (p && !holder.querySelector(".bottle")) {
    holder.insertAdjacentHTML("beforeend", bottleSVG(p.swatch, shortLabel(p), p.id));
    holder.classList.add("has-art");
  }
};

// Anything that failed before this file loaded. The elements are still in
// the document, so the same swap works on them now.
for (const img of window.__artFailed ?? []) window.artFallback(img);
window.__artFailed = [];

function toast(msg) {
  const t = $("[data-toast]");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("is-show"), 2400);
}

const yearEl = $("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ------------------------------------------------------ focus management */

let lastFocused = null;

function trapFocus(container, e) {
  const items = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container)
    .filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openMenu() {
  lastFocused = document.activeElement;
  $("[data-nav]").classList.add("is-open");
  $("[data-overlay]").classList.add("is-open");
  $("[data-menu-toggle]").setAttribute("aria-expanded", "true");
  // menu-open lifts the header above the overlay — see pages.css
  document.body.classList.add("no-scroll", "menu-open");
  setTimeout(() => $("[data-menu-close]").focus(), 60);
}

function closeMenu() {
  const nav = $("[data-nav]");
  if (!nav.classList.contains("is-open")) return;
  nav.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  $("[data-overlay]").classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  $("[data-menu-toggle]").setAttribute("aria-expanded", "false");
  if (lastFocused) lastFocused.focus();
}

/* ------------------------------------------------------ shop page filter */

const grid = $("[data-grid]");
const searchInput = $("[data-search-input]");
const state = { filter: "all", sort: "featured", query: "", family: "all" };

function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [p.name, p.botanical, p.tagline, p.notes.join(" "), catLabel(p.category)]
    .join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

/* -------------------------------------------------------- wishlist (store) */

/*
 * Saved oils, kept in this browser.
 *
 * An array rather than a Set or an object, because the order matters: the
 * saved page lists what you saved most recently first, and that is the whole
 * reason the page is useful after a fortnight of browsing. Newest goes on the
 * front; nothing sorts it afterwards.
 *
 * Deliberately not tied to the account. Doing that needs a serverless
 * function to read and write it, and the Hobby plan is at 12 of 12 with
 * nothing spare — so a saved list would have cost the unsubscribe endpoint or
 * back-in-stock. The honest consequence is that the list does not follow you
 * to your phone, and the saved page says so rather than implying otherwise.
 *
 * The store sits above the card renderer, not beside the rest of the
 * wishlist code further down: `renderGrid` runs while the filters are being
 * wired up, which is before that point, and a `let saved` declared after it
 * is still in its temporal dead zone — the first card drawn would throw.
 */

const SAVED_KEY = "sarvha-saved-v1";

function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY));
    // Products get renamed and retired. An id that no longer exists would
    // render an undefined card, so it is dropped on the way in — the same
    // guard loadCart applies to its keys.
    return Array.isArray(raw) ? raw.filter((id) => byId(id)) : [];
  } catch {
    return [];
  }
}

let saved = loadSaved();
const isSaved = (id) => saved.includes(id);

function persistSaved() {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch {}
}

/*
 * The same heart as templates.mjs renders, with one difference: this one
 * knows whether the oil is saved, because it is drawn in the browser. The
 * built HTML cannot know, so it ships hollow and syncSaved corrects it —
 * these cards arrive already right, which is why renderGrid does not have to
 * call syncSaved afterwards (and must not, since syncSaved redraws grids).
 */
const heartHTML = (p, where = "card") => {
  const on = isSaved(p.id);
  return `<button class="heart heart--${where}" data-save="${p.id}"
    aria-pressed="${on}" aria-label="${on ? "Remove" : "Save"} ${esc(p.name)} ${on ? "from saved" : "for later"}">
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 20.3c-.9-.6-7-4.8-7-9.6a4.1 4.1 0 0 1 7-2.9 4.1 4.1 0 0 1 7 2.9c0 4.8-6.1 9-7 9.6z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>
    <span class="heart__text">${on ? "Saved" : "Save"}</span>
  </button>`;
};

/*
 * `i` is the card's position in the grid, and all it decides is whether the
 * image waits.
 *
 * Every card here was `loading="lazy"`, including the three or four on screen
 * when the page opens. Lazy means "fetch this when it is nearly in view",
 * which for a visible image is a round trip of delay bought for nothing — the
 * browser finds the image, decides it is needed immediately, and starts the
 * request it could have started while parsing. The first row loads eagerly
 * and at high priority; everything below the fold keeps the behaviour that is
 * right for it.
 */
function productCard(p, i = 99) {
  const media = p.image
    // srcsetFor is prepended from src/image.mjs — the same function the build
    // uses. The grid re-renders here on filter, sort and live stock, so a
    // srcset only in the built HTML would vanish on the first interaction.
    ? `<img src="${p.image.src}"${srcsetFor(p.image.src)} alt="${esc(p.image.alt)}" width="900" height="1200"
         ${i < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
         sizes="(max-width: 860px) 50vw, 25vw" data-pid="${p.id}" onerror="artFallback(this)" />`
    : bottleSVG(p.swatch, shortLabel(p), p.id);
  return `<article class="card">
    <a class="card__media" style="background:${p.bg}" href="${p.url}" aria-label="View ${esc(p.name)}">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
      ${media}
    </a>
    ${heartHTML(p)}
    <div class="card__body">
      <span class="card__meta">${catLabel(p.category)}<span class="card__sizes"> · ${p.variants.map((x) => x.size).join(" / ")}</span></span>
      <h3 class="card__title"><a href="${p.url}">${esc(p.name)}</a></h3>
      <p class="card__latin">${esc(p.botanical)}</p>
      <p class="card__desc">${esc(p.tagline)}</p>
      <div class="card__foot">
        <span class="card__price">Price on request</span>
        <a class="add-btn" href="${p.url}">Request a quote</a>
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  if (!grid) return;
  let list = C.products.filter((p) => state.filter === "all" || p.category === state.filter);
  list = list.filter((p) => matchesQuery(p, state.query));
  list = list.filter((p) => state.family === "all" || p.family === state.family);
  if (state.sort === "featured") list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  if (state.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  grid.innerHTML = list.length
    ? `<div class="grid">${list.map((p, i) => productCard(p, i)).join("")}</div>`
    : `<div class="no-results">
         <p><strong>No oils match that.</strong></p>
         <p class="muted">Try a different word, or browse the whole collection.</p>
         <button class="btn btn--ghost" data-reset-filters>Clear filters</button>
       </div>`;

  const counter = $("[data-result-count]");
  if (counter) {
    const bits = [];
    if (state.filter !== "all") bits.push(`in <strong>${catLabel(state.filter)}</strong>`);
    if (state.family !== "all") bits.push(`in <strong>${esc(state.family)}</strong>`);
    if (state.query) bits.push(`matching “${esc(state.query)}”`);
    counter.innerHTML = `${list.length} oil${list.length === 1 ? "" : "s"}` +
      (bits.length ? ` ${bits.join(" ")} · <button class="linkish" data-reset-filters>clear</button>` : "");
  }

  // Keep the URL shareable: /shop/?collection=energy
  const url = new URL(location.href);
  const put = (key, value, off) => {
    if (value === off) url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  };
  put("collection", state.filter, "all");
  put("family", state.family, "all");
  history.replaceState(null, "", url);
}

function setFilter(id) {
  state.filter = id;
  $$("[data-filter]").forEach((b) => {
    const on = b.dataset.filter === id;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  renderGrid();
}

const familySelect = $("[data-family]");

/* A shared /shop/ link should show what the sender was looking at. Values are
   checked against the control's own options rather than trusted, so a hand-
   edited URL cannot put the grid in a state the controls cannot undo. */
if (grid) {
  const params = new URL(location.href).searchParams;
  const pick = (el, value) => {
    if (!el || value == null) return null;
    const ok = [...el.options].some((o) => o.value === value);
    if (!ok) return null;
    el.value = value;
    return value;
  };
  state.family = pick(familySelect, params.get("family")) ?? "all";
}

const filters = $("[data-filters]");
if (filters) {
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (btn) setFilter(btn.dataset.filter);
  });
  const preset = new URL(location.href).searchParams.get("collection");
  if (preset && C.categories.some((c) => c.id === preset)) setFilter(preset);
  else renderGrid();
}

if (familySelect) familySelect.addEventListener("change", (e) => { state.family = e.target.value; renderGrid(); });

const sortSelect = $("[data-sort]");
if (sortSelect) sortSelect.addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });

if (searchInput) {
  let t;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(t);
    const val = e.target.value;
    t = setTimeout(() => { state.query = val.trim(); renderGrid(); }, 160);
  });
  if (location.hash === "#search") setTimeout(() => searchInput.focus(), 200);
}

/* ------------------------------------------------------------ oil library */

const lib = $("[data-library]");
if (lib) {
  lib.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const col = e.target.closest("[data-lib]");
    if (!col) return;
    $$("[data-lib]", lib).forEach((c) => {
      const on = c === col;
      c.classList.toggle("is-open", on);
      $(".lib__toggle", c).setAttribute("aria-expanded", String(on));
    });
  });
}

/* --------------------------------------------------------- custom select */
/**
 * A browser draws a <select>'s open option list itself, so CSS can't reach it
 * and it arrives in OS chrome — square corners, system blue highlight. This
 * upgrades each <select> into a button + listbox we can style, keeping the
 * original element in the DOM (hidden) as the value and firing its `change`
 * event, so every listener elsewhere keeps working untouched.
 */
function enhanceSelect(select) {
  if (select.dataset.enhanced) return;
  select.dataset.enhanced = "1";

  const id = "sel" + Math.random().toString(36).slice(2, 8);
  const options = [...select.options].map((o) => ({ value: o.value, label: o.textContent.trim() }));
  const labelEl = select.closest("label");
  const name = select.getAttribute("aria-label")
    || (labelEl ? labelEl.childNodes[0].textContent.trim() : "")
    || "Select an option";

  const wrap = document.createElement("div");
  wrap.className = "select";
  wrap.innerHTML = `
    <button type="button" class="select__btn" id="${id}-btn"
      aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(name)}">
      <span class="select__value">${esc(options.find((o) => o.value === select.value)?.label || options[0].label)}</span>
      <svg class="select__chev" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <ul class="select__menu" role="listbox" tabindex="-1" aria-labelledby="${id}-btn" hidden>
      ${options.map((o, i) => `
        <li class="select__opt" role="option" id="${id}-o${i}" data-value="${esc(o.value)}"
            aria-selected="${o.value === select.value}">
          <svg class="select__tick" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>${esc(o.label)}</span>
        </li>`).join("")}
    </ul>`;

  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.hidden = true;
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;

  const btn = $(".select__btn", wrap);
  const menu = $(".select__menu", wrap);
  const opts = $$(".select__opt", wrap);
  let active = Math.max(0, options.findIndex((o) => o.value === select.value));

  const setActive = (i) => {
    active = (i + opts.length) % opts.length;
    opts.forEach((o, n) => o.classList.toggle("is-active", n === active));
    menu.setAttribute("aria-activedescendant", opts[active].id);
    opts[active].scrollIntoView({ block: "nearest" });
  };

  const open = () => {
    menu.hidden = false;
    wrap.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    // Flip above the button when there isn't room below.
    const room = window.innerHeight - btn.getBoundingClientRect().bottom;
    wrap.classList.toggle("is-up", room < menu.offsetHeight + 24);
    setActive(active);
    menu.focus();
  };

  const close = (refocus = true) => {
    if (menu.hidden) return;
    menu.hidden = true;
    wrap.classList.remove("is-open", "is-up");
    btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus();
  };

  const choose = (i) => {
    const o = options[i];
    select.value = o.value;
    $(".select__value", wrap).textContent = o.label;
    opts.forEach((el, n) => el.setAttribute("aria-selected", String(n === i)));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  };

  // preventDefault matters inside a <label>: without it the label forwards the
  // click to its control, which toggles the menu a second time and reopens it.
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    menu.hidden ? open() : close();
  });

  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
  });

  menu.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); return setActive(active + 1);
      case "ArrowUp": e.preventDefault(); return setActive(active - 1);
      case "Home": e.preventDefault(); return setActive(0);
      case "End": e.preventDefault(); return setActive(opts.length - 1);
      case "Enter": case " ": e.preventDefault(); return choose(active);
      case "Escape": e.preventDefault(); return close();
      case "Tab": return close(false);
      default: {
        // Type-ahead, the way a native select behaves.
        if (e.key.length !== 1) return;
        const from = active + 1;
        const found = options.findIndex((o, i) =>
          o.label.toLowerCase().startsWith(e.key.toLowerCase()) && i >= from);
        const idx = found !== -1 ? found
          : options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
        if (idx !== -1) setActive(idx);
      }
    }
  });

  menu.addEventListener("click", (e) => {
    const li = e.target.closest(".select__opt");
    if (!li) return;
    e.preventDefault();
    choose(opts.indexOf(li));
  });

  menu.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".select__opt");
    if (li && opts.indexOf(li) !== active) setActive(opts.indexOf(li));
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) close(false);
  });
}

$$("select").forEach(enhanceSelect);

/* ------------------------------------------------------- wishlist (views) */

/**
 * Bring every heart, the header count and the saved grid into line with
 * `saved`.
 *
 * One function for all three because they are three views of one list, and
 * the first version updated only the heart that was clicked — which left the
 * other copy of the same oil (a card in "You may also like", say) showing
 * hollow while the list said otherwise.
 */
function syncSaved() {
  for (const btn of $$("[data-save]")) {
    const on = isSaved(btn.dataset.save);
    const p = byId(btn.dataset.save);
    btn.setAttribute("aria-pressed", String(on));
    if (p) btn.setAttribute("aria-label", `${on ? "Remove" : "Save"} ${p.name} ${on ? "from" : "for"} ${on ? "saved" : "later"}`);
    const text = $(".heart__text", btn);
    if (text) text.textContent = on ? "Saved" : "Save";
  }

  const link = $("[data-saved-link]");
  if (link) {
    link.hidden = saved.length === 0;
    link.setAttribute("aria-label", saved.length
      ? `Saved items, ${saved.length} oil${saved.length === 1 ? "" : "s"}`
      : "Saved items");
    $("[data-saved-count]").textContent = saved.length;
  }

  renderSavedGrid();
}

function toggleSaved(id) {
  const p = byId(id);
  if (!p) return;
  if (isSaved(id)) {
    saved = saved.filter((x) => x !== id);
    toast(`${p.name} removed from saved`);
  } else {
    saved = [id, ...saved];
    toast(`${p.name} saved`);
  }
  persistSaved();
  syncSaved();
}

const savedGrid = $("[data-saved-grid]");

function renderSavedGrid() {
  if (!savedGrid) return;
  const list = saved.map(byId).filter(Boolean);
  savedGrid.innerHTML = list.length
    ? `<p class="saved__count">${list.length} oil${list.length === 1 ? "" : "s"} saved</p>
       <div class="grid">${list.map((p, i) => productCard(p, i)).join("")}</div>`
    : `<div class="no-results">
         <p><strong>Nothing saved yet.</strong></p>
         <p class="muted">Tap the heart on any oil to keep it here for later.</p>
         <a class="btn btn--ghost" href="/shop/">Browse the shop</a>
       </div>`;
}

/*
 * Two tabs, one list. localStorage fires `storage` in the other tabs when a
 * tab writes to it, so saving something in one tab no longer leaves the
 * other showing a stale count and hollow hearts until it is reloaded.
 */
window.addEventListener("storage", (e) => {
  if (e.key !== SAVED_KEY) return;
  saved = loadSaved();
  syncSaved();
});

syncSaved();

/* ---------------------------------------------------------------- events */

document.addEventListener("click", (e) => {
  const t = e.target;

  const save = t.closest("[data-save]");
  if (save) { e.preventDefault(); return toggleSaved(save.dataset.save); }

  if (t.closest("[data-reset-filters]")) {
    e.preventDefault();
    state.query = "";
    if (searchInput) searchInput.value = "";
    state.family = "all";
    if (familySelect) familySelect.value = "all";
    return setFilter("all");
  }

  if (t.closest("[data-menu-toggle]")) return openMenu();
  if (t.closest("[data-menu-close]")) return closeMenu();
  if (t === $("[data-overlay]")) return closeMenu();
  if (t.closest("[data-nav] a")) return closeMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
  if (e.key === "Tab") {
    if ($("[data-nav]").classList.contains("is-open")) trapFocus($("[data-nav]"), e);
  }
  if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    if (searchInput) { e.preventDefault(); searchInput.focus(); }
    else { e.preventDefault(); location.href = "/shop/#search"; }
  }
});

/* Both of these used to say "sent" and then throw the message away. They now
   post to the API, and say nothing that has not actually happened. */

async function postJson(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(API_UNREACHABLE);
  }
  if (res.status === 404) throw new Error(API_MISSING);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || API_DOWN);
  return data;
}

/** A failed submit must not look like a successful one. */
function formFeedback(form, err) {
  toast(errorText(err));
  form.querySelector("button[type=submit]").disabled = false;
}

const news = $("[data-newsletter]");
if (news) news.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = e.target.querySelector("input[type=email]");
  if (!input.checkValidity()) return toast("Please enter a valid email address");

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await postJson("/api/newsletter", {
      email: input.value,
      source: location.pathname,
      website: e.target.querySelector("[name=website]")?.value,
    });
    e.target.reset();
    // Deliberately not "check your inbox": nothing is sent yet, and a
    // discount code that never arrives is worse than no promise at all.
    toast("You're on the list — thank you.");
  } catch (err) {
    formFeedback(e.target, err);
  } finally {
    btn.disabled = false;
  }
});

/* Every "Request a quote" button links here as /contact/?oil=<id>. Without
   this the enquiry arrives without the one fact it is about, and whoever
   answers it has to write back to ask which oil. The name is looked up in
   the catalogue rather than printed from the URL, so a hand-edited ?oil=
   cannot put arbitrary text into the form. */
const quoteFor = new URL(location.href).searchParams.get("oil");
if (quoteFor) {
  const oil = C.products.find((p) => p.id === quoteFor);
  const subject = $("[data-contact] select[name=subject]");
  const message = $("[data-contact] textarea[name=message]");
  if (oil && message && !message.value) {
    if (subject) subject.value = "Request a quote";
    message.value = `I'd like a quote for ${oil.name} (${oil.botanical}).\n\n`
      + `Barrel size: \nQuantity: \nDelivery to: \n`;
    message.focus();
    message.setSelectionRange(message.value.length, message.value.length);
  }
}

const contact = $("[data-contact]");
if (contact) contact.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) return toast("Please fill in every required field");

  const f = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await postJson("/api/contact", f);
    e.target.reset();
    toast("Thanks — we've got it and we'll reply by email.");
  } catch (err) {
    formFeedback(e.target, err);
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------------------------ motion */

const header = $("[data-header]");
addEventListener("scroll", () => {
  header.classList.toggle("is-stuck", window.scrollY > 10);
}, { passive: true });

if (!prefersReducedMotion() && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  $$("[data-reveal]").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
}


/* ------------------------------------------------------- footer columns */
/**
 * The footer's six columns ship open, so every link is in the markup for
 * crawlers and for anyone without JS. On a phone that is an unusable wall,
 * so collapse them there — leaving the first one open as an affordance.
 */
const footerCols = $$(".footer__col");
if (footerCols.length) {
  const narrow = window.matchMedia("(max-width: 860px)");
  const sync = () => footerCols.forEach((d, i) => {
    d.open = narrow.matches ? i === 0 : true;
  });
  sync();
  narrow.addEventListener("change", sync);
}

/* ------------------------------------------------------- the oil library */
/**
 * The build renders whichever five oils were current on the day it ran. A
 * static page can sit on a CDN for months, so recompute on load and swap if
 * the day has moved on.
 *
 * The window of five slides along the twelve entries by five a day. Since
 * 5 + 5 is less than 12, two consecutive days can never share an oil.
 *
 * Backgrounds are carried as data-bg and applied here rather than inlined by
 * the build. A stale build would otherwise start fetching five images the
 * visitor never sees — about 340 KB — before this code replaces them.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const libraryDay = (now = Date.now()) => Math.floor((now + IST_OFFSET_MS) / 86400000);

function libraryFor(day, entries) {
  const size = Math.min(5, entries.length);
  const start = ((day * size) % entries.length + entries.length) % entries.length;
  return Array.from({ length: size }, (_, n) => entries[(start + n) % entries.length]);
}

/** Only the columns actually on screen ever request an image. */
const paintLibrary = (root) => $$(".lib__img[data-bg]", root).forEach((el) => {
  el.style.backgroundImage = `url('${el.dataset.bg}')`;
  el.removeAttribute("data-bg");
});

const libraryEl = $("[data-library]");
if (libraryEl && C.library && C.library.length) {
  const todays = libraryFor(libraryDay(), C.library);
  const shown = [...libraryEl.querySelectorAll("[data-lib]")]
    .map((el) => $(".lib__name", el).textContent.trim());

  // Only touch the DOM when the build is out of date.
  if (shown.join("|") !== todays.map((e) => e.name).join("|")) {
    libraryEl.innerHTML = todays.map((e, i) => `
      <article class="lib${i === 0 ? " is-open" : ""}" data-lib="${i}">
        <div class="lib__img" data-bg="${e.image}" role="img" aria-label="${esc(e.name)}"></div>
        <div class="lib__veil"></div>
        <button class="lib__toggle" aria-expanded="${i === 0}"><span class="lib__name">${esc(e.name)}</span></button>
        <div class="lib__panel">
          <p class="lib__story">${esc(e.name)} is a <em>${esc(e.story)}</em> story</p>
          <p class="lib__latin">${esc(e.botanical)} · ${esc(e.origin)}</p>
          <p class="lib__blurb">${esc(e.blurb)}</p>
          <a class="btn btn--light" href="${e.url}">View oil</a>
        </div>
      </article>`).join("");
  }

  paintLibrary(libraryEl);
}

/* ------------------------------------------------------- signed-in hint */
/* The header has to show whether you are signed in, on a static page, without
   asking the server on every visit. So a hint is kept in localStorage: your
   first name and nothing else. It is a display hint and never a permission —
   every endpoint checks the session cookie regardless, and editing this value
   grants exactly nothing. Pages that do talk to the server correct it. */

const SIGNED_IN_KEY = "sarvha-account-v1";

function setSignedIn(name) {
  try {
    if (name) localStorage.setItem(SIGNED_IN_KEY, name);
    else localStorage.removeItem(SIGNED_IN_KEY);
  } catch {}
  paintAccountLink();
}

function paintAccountLink() {
  const link = $("[data-account-link]");
  if (!link) return;

  let name = null;
  try { name = localStorage.getItem(SIGNED_IN_KEY); } catch {}

  const dot = $("[data-account-dot]", link);
  if (dot) dot.hidden = !name;
  link.setAttribute(
    "aria-label",
    name ? `Your account — signed in as ${name}` : "Log in or create an account",
  );
}

paintAccountLink();

/* --------------------------------------------------- talking to the API */
/* Three different things can go wrong fetching from /api/, and they want
   three different messages. Collapsing them into "please refresh" tells
   someone to retry when the endpoint does not exist, which it does not on a
   static preview, and never will until the backend is deployed. */

const API_MISSING = "api_missing";   // no backend here — refreshing cannot help
const API_DOWN = "api_down";         // it exists but is unwell — retrying might
const API_UNREACHABLE = "offline";   // the request never arrived

async function apiGet(path) {
  let res;
  try {
    res = await fetch(path, { credentials: "same-origin" });
  } catch {
    throw new Error(API_UNREACHABLE);
  }

  // A 404 from a static host means the function was never deployed. So does
  // an HTML body where JSON was expected: that is the host's own 404 page.
  if (res.status === 404) throw new Error(API_MISSING);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? API_MISSING : API_DOWN);
  }

  /*
   * A failed request that happens to return readable JSON was being handed
   * back as if it had worked. The caller then read a field that was not
   * there, threw a TypeError, and the page said "Couldn't load that" — with
   * the server's own explanation sitting unread in the body. Throw it
   * instead, so whatever the endpoint took the trouble to say gets shown.
   */
  if (!res.ok) throw new Error(data?.error || API_DOWN);
  return data;
}

const apiMessage = (err) => ({
  [API_MISSING]: "Accounts aren't switched on yet — this is a preview of the site without its server.",
  [API_UNREACHABLE]: "We couldn't reach the server. Check your connection and try again.",
})[err?.message] ?? "Something went wrong at our end. Please try again in a moment.";

/**
 * What to show a person when a request fails.
 *
 * The three sentinels above describe the connection rather than the request,
 * and only those get the friendly rewrite. Anything else is a message the
 * server wrote for this exact situation — "That current password isn't
 * right", "Only 3 of Lavender 15 ml left" — and replacing it with a generic
 * apology throws away the one useful thing in the response.
 *
 * Passing every error through apiMessage did exactly that, because its
 * fallback catches everything it does not recognise.
 */
const SENTINELS = [API_MISSING, API_UNREACHABLE, API_DOWN];
const errorText = (err) =>
  SENTINELS.includes(err?.message) ? apiMessage(err) : (err?.message || apiMessage(err));

/* ------------------------------------------------------------- accounts */
/* Progressive enhancement: these pages are plain forms. Without JavaScript
   they do nothing useful, which is why nothing else on the site depends on
   having an account. */

const authForm = $("[data-auth-form]");

if (authForm) {
  const errorBox = $("[data-auth-error]", authForm);
  const submit = $("button[type=submit]", authForm);

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const kind = authForm.dataset.authForm; // "login" | "register"
    const body = Object.fromEntries(new FormData(authForm));

    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = kind === "login" ? "Logging in…" : "Creating account…";

    try {
      // Signing in is a session; registering is a new customer. Different
      // resources, so different routes — login.js, logout.js and me.js were
      // merged into one /api/auth/session that the method decides between.
      const res = await fetch(kind === "login" ? "/api/auth/session" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The session cookie is HttpOnly; this is what lets the browser
        // store the one the server sets.
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSignedIn(data.customer?.name ?? "");

      // `next` lets checkout send someone here and get them back afterwards.
      // safeNext comes from src/redirect.mjs, prepended by the build.
      location.href = safeNext(new URLSearchParams(location.search).get("next"));
    } catch {
      showError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}

/*
 * Saving a change from the account page.
 *
 * One listener for all three forms, delegated on the panel, because the
 * panel is re-rendered after every save and a listener bound to a form
 * would die with it.
 *
 * The endpoint answers with what it stored rather than echoing what was
 * sent, so re-reading after a save shows the normalised value — a phone
 * typed as "+91 98765 43210" comes back as "9876543210", which is what
 * will actually be on the parcel.
 */
/* ---------------------------------------------------------------- admin */
/* Read-and-write views over /api/admin/*. Every one of those checks the
   admin flag server-side and answers 404 otherwise, so this page failing to
   hide itself would leak nothing. */

const adminGate = $("[data-admin-gate]");

if (adminGate) {
  const root = $("[data-admin]");
  const panel = (name) => $(`[data-panel="${name}"]`);
  const date = (s) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rupees = (paise) => money(paise / 100);

  const say = (message) => toast(message);

  /**
   * POST to an admin endpoint.
   *
   * Returns the parsed body on success and null on failure, rather than a
   * bare boolean. Callers only need "did it work?" today, but the endpoints
   * already answer with more than that, and the next thing dispatch has to
   * report — whether the customer's email actually sent — cannot be carried
   * by a boolean.
   */
  async function post(path, body) {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { say(data.error || "That didn't work."); return null; }
      // An endpoint answering 200 with an empty body is still a success, so
      // never return something falsy here.
      return data ?? {};
    } catch {
      say("Couldn't reach the server.");
      return null;
    }
  }

  /* ---------------------------------------------------- excel export */
  /* Built here from the orders already on the page rather than from a new
     endpoint: the data is in hand, and another admin route is another thing
     to guard. ordersToCsv is prepended from src/csv.mjs, which the tests
     cover — the quoting and the formula guard are not worth a second,
     untested copy. */

  let lastOrders = [];

  const exportBtn = $("[data-export-orders]");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      // Asks for every order rather than reusing what the page is showing.
      // The page draws at most 100 cards; a spreadsheet that stopped at the
      // hundredth order would be wrong in a way nobody notices until the
      // accounts do not add up.
      const previous = exportBtn.textContent;
      exportBtn.disabled = true;
      exportBtn.textContent = "Preparing…";

      const data = await apiGet("/api/admin/orders?all=1").catch(() => null);

      exportBtn.disabled = false;
      exportBtn.textContent = previous;

      const all = data?.orders ?? [];
      if (!all.length) return say("No orders to export yet.");

      const blob = new Blob([ordersToCsv(all)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ordersFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoking immediately can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      say(`${all.length} order${all.length === 1 ? "" : "s"} downloaded.`);
    });
  }

  /* ---------------------------------------------------------- orders */

  let emailReady = false;
  let emailWhy = "";

  const addressOf = (o) =>
    [o.address_line1, o.address_line2, o.address_city, o.address_state, o.address_postcode]
      .filter(Boolean).map(esc).join(", ");

  /* True once the full list has been fetched, so searching does not refetch
     on every keystroke. Reset when the search is cleared. */
  let loadedAll = false;

  async function loadOrders({ all = false } = {}) {
    const data = await apiGet(`/api/admin/orders${all ? "?all=1" : ""}`);
    loadedAll = all;
    lastOrders = data.orders ?? [];
    // Whether a thank-you can be sent at all. Said once, on the button, so a
    // click never fails with an error the page could have predicted.
    emailReady = data.email?.configured === true;
    emailWhy = data.email?.reason ?? "";

    // Say what is not on screen, rather than drawing a truncated list that
    // looks complete.
    const showing = $("[data-orders-showing]");
    if (showing) {
      showing.textContent = data.total > data.showing
        ? `Showing ${data.showing} of ${data.total} orders — the export includes all of them.`
        : "";
    }

    const syncBtn = $("[data-sync-sheet]");
    if (syncBtn) {
      // Hidden rather than disabled when there is no sheet at all: a button
      // for a feature you have not set up is clutter, not information.
      syncBtn.hidden = !data.sheet;
      if (data.sheet && !data.sheet.configured) {
        syncBtn.hidden = true;
      }
    }
    $("[data-admin-stats]").innerHTML = `
      <div><strong>${data.counts.to_ship}</strong><span>to dispatch</span></div>
      <div><strong>${rupees(data.counts.taken_paise)}</strong><span>taken</span></div>
      ${data.counts.oversold
        ? `<div class="is-warn"><strong>${data.counts.oversold}</strong><span>oversold</span></div>` : ""}`;

    /*
     * A table, because this is a list you read across: who, when, how much,
     * what needs doing. Cards stack the same facts vertically and make you
     * scan down a column of prose to compare two orders.
     *
     * The detail row carries everything that does not belong in a scan — the
     * address, the line items, and the things you can do about the order —
     * and stays closed until asked for.
     *
     * The previous version nested the resolve form inside a
     * `status === "paid"` branch and then tested for "oversold" inside it, a
     * condition that can never hold, so the form it drew never appeared on
     * screen at all. Flattening the conditions is what stops that shape of
     * mistake: each action now tests exactly one thing.
     */
    panel("orders").innerHTML = data.orders.length
      ? `<div class="apanel">
          <table class="atable">
            <thead><tr>
              <th>Order</th><th>Status</th><th>Placed</th><th>Customer</th>
              <th class="atable--num">Total</th><th></th>
            </tr></thead>
            <tbody>${data.orders.map((o) => {
              const needsDecision = o.status === "oversold" && !o.resolved_at;
              return `
              <tr class="arow${needsDecision ? " is-warn" : ""}">
                <td>
                  <strong>${o.items.map((i) =>
                    `${i.qty}× ${esc(i.name)} ${esc(i.size)}`).join(", ") || "—"}</strong>
                  <div class="amono">${esc(o.id.slice(0, 8).toUpperCase())}</div>
                </td>
                <td>
                  <span class="abadge abadge--${esc(o.status)}">${esc(o.status)}</span>
                  ${o.resolved_at ? `<span class="abadge abadge--done">dealt with</span>` : ""}
                </td>
                <td class="amuted">${date(o.created_at)}</td>
                <td>${esc(o.customer_name)}
                  <div class="amuted">${esc(o.address_city)}</div></td>
                <td class="atable--num">${rupees(o.total_paise)}</td>
                <td class="atable--act">
                  <button class="abtn" data-order-detail="${esc(o.id)}"
                    aria-expanded="false">Details</button>
                </td>
              </tr>
              <tr class="adetail" data-detail-for="${esc(o.id)}" hidden>
                <td colspan="6">
                  <div class="adetail__grid">
                    <div>
                      <h4>Deliver to</h4>
                      <p>${addressOf(o)}</p>
                      <p class="amuted">${esc(o.customer_email)}${
                        o.customer_phone ? ` · ${esc(o.customer_phone)}` : ""}</p>
                      ${o.notes ? `<p class="amuted">Note: ${esc(o.notes)}</p>` : ""}
                    </div>

                    <div>
                      <h4>Items</h4>
                      <ul class="adetail__items">${o.items.map((i) =>
                        `<li>${i.qty} × ${esc(i.name)} ${esc(i.size)}</li>`).join("")}</ul>
                      <p class="amuted">Shipping ${
                        o.shipping_paise ? rupees(o.shipping_paise) : "free"}</p>
                      ${o.shipped_at ? `<p class="amuted">Dispatched ${date(o.shipped_at)}${
                        o.tracking ? ` · ${esc(o.tracking)}` : ""}</p>` : ""}
                    </div>

                    <div>
                      <h4>Actions</h4>
                      ${needsDecision ? `
                        <form class="admin__resolve" data-resolve="${esc(o.id)}">
                          <input name="note" type="text" maxlength="500"
                            placeholder="What did you do? (refunded, reshipped…)" />
                          <button class="btn btn--ghost" type="submit">Mark dealt with</button>
                        </form>` : ""}
                      ${o.status === "oversold" && o.resolved_at ? `
                        <p class="admin__resolved">Dealt with ${date(o.resolved_at)}${
                          o.resolution ? ` — ${esc(o.resolution)}` : ""}</p>` : ""}
                      ${o.status === "paid" ? `
                        <form class="admin__ship" data-ship="${esc(o.id)}">
                          <input type="text" name="tracking"
                            placeholder="Tracking reference (optional)" />
                          <button class="btn btn--primary" type="submit">Mark dispatched</button>
                        </form>` : ""}
                      ${o.status === "paid" || o.status === "shipped" ? `
                        <button class="btn btn--ghost admin__thank" data-thank="${esc(o.id)}"
                          ${emailReady ? "" : "disabled"}
                          title="${emailReady ? "Send a thank-you to " + esc(o.customer_email)
                                              : "Email is not set up yet: " + esc(emailWhy)}">
                          ${o.thanked_at ? "Thank-you sent — send again" : "Send thank-you"}
                        </button>` : ""}
                      ${o.status === "created" || o.status === "failed"
                        ? `<p class="amuted">Never paid for — nothing to do.</p>` : ""}
                    </div>
                  </div>
                </td>
              </tr>`;
            }).join("")}</tbody>
          </table>
        </div>`
      : `<p class="muted apanel apanel--empty">No orders yet.</p>`;
  }

  /* -------------------------------------------------------- messages */

  async function loadMessages() {
    const data = await apiGet("/api/admin/messages");
    /*
     * The same table as orders, with the message itself in the detail row.
     *
     * A contact message is mostly prose, and prose in a table cell makes
     * every row a different height and the whole thing unreadable. The
     * subject and who sent it are what you scan; the body is what you open.
     */
    panel("messages").innerHTML = `
      <p class="astat">${data.counts.unhandled} unanswered ·
         ${data.counts.subscribers} newsletter subscribers</p>
      ${data.messages.length
        ? `<div class="apanel">
            <table class="atable">
              <thead><tr>
                <th>From</th><th>Subject</th><th>Received</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>${data.messages.map((m) => `
                <tr class="arow${m.handled_at ? " is-done" : ""}">
                  <td>
                    <strong>${esc(m.name)}</strong>
                    <div class="amuted">${esc(m.email)}</div>
                  </td>
                  <td>${m.subject ? esc(m.subject) : `<span class="amuted">(no subject)</span>`}</td>
                  <td class="amuted">${date(m.created_at)}</td>
                  <td>${m.handled_at
                    ? `<span class="abadge abadge--done">done</span>`
                    : `<span class="abadge abadge--oversold">waiting</span>`}</td>
                  <td class="atable--act">
                    <button class="abtn" data-order-detail="msg-${esc(m.id)}"
                      aria-expanded="false">Read</button>
                  </td>
                </tr>
                <tr class="adetail" data-detail-for="msg-${esc(m.id)}" hidden>
                  <td colspan="5">
                    <div class="adetail__grid">
                      <div class="adetail__body">
                        <h4>Message</h4>
                        <p>${esc(m.body)}</p>
                      </div>
                      <div>
                        <h4>Actions</h4>
                        <p><a class="btn btn--ghost" href="mailto:${esc(m.email)}${
                          m.subject ? `?subject=${encodeURIComponent("Re: " + m.subject)}` : ""
                        }">Reply by email</a></p>
                        <p><button class="btn btn--ghost" data-handled="${esc(m.id)}"
                          data-to="${m.handled_at ? "false" : "true"}">
                          ${m.handled_at ? "Reopen" : "Mark done"}
                        </button></p>
                        ${m.handled_at
                          ? `<p class="amuted">Marked done ${date(m.handled_at)}</p>` : ""}
                        ${m.from_account
                          ? `<p class="amuted">Sent while logged in.</p>`
                          : `<p class="amuted">Sent by a visitor who was not logged in.</p>`}
                      </div>
                    </div>
                  </td>
                </tr>`).join("")}</tbody>
            </table>
          </div>`
        : `<p class="muted apanel apanel--empty">Nothing yet.</p>`}`;
  }

  /* Opening an order's detail row. Delegated, because the table is redrawn
     after every action. */
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order-detail]");
    if (!btn) return;
    const row = $(`[data-detail-for="${btn.dataset.orderDetail}"]`, root);
    if (!row) return;
    const open = row.hidden;
    row.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    // "Details" on an order, "Read" on a message: remember whichever the
    // button started as rather than imposing one word on both.
    if (!btn.dataset.closed) btn.dataset.closed = btn.textContent.trim();
    btn.textContent = open ? "Close" : btn.dataset.closed;
  });

  /* Recording what was done about an oversold order. It does not refund
     anybody or send anything — it records a decision a person already made,
     so the order stops sitting at the top of the list forever. */
  root.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-resolve]");
    if (!form) return;
    e.preventDefault();

    const result = await post("/api/admin/orders", {
      id: form.dataset.resolve,
      action: "resolve",
      note: form.note.value,
    });

    if (result?.resolved) {
      say("Recorded. The customer has not been told anything by this.");
      loadOrders();
    }
  });

  /* Sync to the sheet. Reports the row count on success and Google's own
     complaint on failure — "sync failed" with no reason means opening a log
     nobody has. */
  const syncBtn = $("[data-sync-sheet]");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      const previous = syncBtn.textContent;
      syncBtn.disabled = true;
      syncBtn.textContent = "Syncing…";

      const result = await post("/api/admin/orders", { action: "sync" });

      syncBtn.disabled = false;
      syncBtn.textContent = previous;

      if (result?.synced) {
        say(`${result.rows} order${result.rows === 1 ? "" : "s"} written to the sheet.`);
      }
    });
  }

  /* The thank-you button. Reports what actually happened — the endpoint
     answers 502 with a reason when the provider refuses, and post() shows
     that message, so a failed send is never reported as a success. */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-thank]");
    if (!btn) return;
    e.preventDefault();

    const previous = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";

    const result = await post("/api/admin/orders", { id: btn.dataset.thank, action: "thank" });

    if (result?.sent) {
      say(`Thank-you sent to ${result.to}.`);
      loadOrders();
    } else {
      btn.disabled = false;
      btn.textContent = previous;
    }
  });

  /* ----------------------------------------------------------- stock */

  async function loadStock() {
    const data = await apiGet("/api/admin/stock");
    /*
     * Already a table; now the same table as the other two, with the sku
     * shown because that is what the spreadsheet and the courier label
     * carry, and a badge for the two states worth noticing from across the
     * room.
     */
    panel("stock").innerHTML = `
      <p class="astat">${data.counts.out_of_stock} sold out ·
         ${data.counts.low} low (5 or fewer)</p>
      <div class="apanel">
        <table class="atable">
          <thead><tr>
            <th>Oil</th><th>Size</th><th>State</th>
            <th class="atable--num">In stock</th><th>Updated</th>
          </tr></thead>
          <tbody>${data.stock.map((s) => `
            <tr class="arow${s.quantity === 0 ? " is-warn" : ""}">
              <td>
                <strong>${esc(s.name)}</strong>${s.orphan
                  ? ` <span class="amuted">(not in catalogue)</span>` : ""}
                <div class="amono">${esc(s.sku)}</div>
              </td>
              <td class="amuted">${esc(s.size)}</td>
              <td>${s.quantity === 0
                ? `<span class="abadge abadge--oversold">sold out</span>`
                : s.quantity <= 5
                  ? `<span class="abadge abadge--created">low</span>`
                  : `<span class="abadge abadge--paid">in stock</span>`}</td>
              <td class="atable--num">
                <form class="admin__qty" data-stock="${esc(s.sku)}">
                  <input type="number" name="quantity" value="${s.quantity}"
                    min="0" max="10000" aria-label="Quantity of ${esc(s.name)} ${esc(s.size)}" />
                  <button class="abtn" type="submit">Save</button>
                </form>
              </td>
              <td class="amuted">${s.updated_at ? date(s.updated_at) : ""}</td>
            </tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  const loaders = { orders: loadOrders, messages: loadMessages, stock: loadStock };

  /* ---------------------------------------------------------- search */
  /* Filters the rows already drawn, rather than asking the server on every
     keystroke. Everything searchable is on screen — name, email, city,
     tracking, the oils in the order, the sku — so matching the row's own
     text finds all of it without a field list that would go stale the next
     time a column is added.

     The one thing the DOM cannot answer for is an order beyond the hundred
     the page draws, so searching the orders tab fetches the rest first. */

  const searchBox = $("[data-admin-search]");
  let query = "";

  /** Which tab is showing. */
  const activeTab = () => $("[data-tab].is-on", root)?.dataset.tab ?? "orders";

  function applySearch() {
    const name = activeTab();
    const host = panel(name);
    if (!host) return;

    const rows = $$(".admin__row, .admin__stock tbody tr", host);
    const needle = query.trim().toLowerCase();

    let shown = 0;
    for (const row of rows) {
      const hit = !needle || row.textContent.toLowerCase().includes(needle);
      row.hidden = !hit;
      if (hit) shown++;
    }

    // Say when a search matched nothing, rather than showing a blank panel
    // that looks like a failure to load.
    let empty = $("[data-search-empty]", host);
    if (needle && shown === 0) {
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "muted";
        empty.setAttribute("data-search-empty", "");
        host.appendChild(empty);
      }
      empty.textContent = `Nothing in ${name} matches “${query.trim()}”.`;
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  if (searchBox) {
    let timer;
    searchBox.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        query = searchBox.value;

        // A search of the orders tab must cover every order, not the
        // hundred on screen — otherwise it quietly reports "no match" for
        // an order that exists.
        if (query.trim() && activeTab() === "orders" && !loadedAll) {
          await loadOrders({ all: true }).catch(() => {});
        }
        applySearch();
      }, 180);
    });
  }

  /* ------------------------------------------------------ behaviour */

  /*
   * Tab switching is bound to the document, not to [data-admin], because the
   * tabs live in the admin bar — outside the panel they control. Bound to
   * the panel, as they were when the tabs sat inside it, every click did
   * nothing at all and nothing said why.
   */
  document.addEventListener("click", async (e) => {
    const tab = e.target.closest("[data-tab]");
    if (!tab) return;
    $$("[data-tab]").forEach((t) => t.classList.toggle("is-on", t === tab));
    for (const name of Object.keys(loaders)) panel(name).hidden = name !== tab.dataset.tab;
    await loaders[tab.dataset.tab]().catch(() => say("Couldn't load that."));
    // A search survives a tab change; the box still shows the text, so the
    // list it filters had better match it.
    applySearch();
  });

  root.addEventListener("click", async (e) => {
    const done = e.target.closest("[data-handled]");
    if (done) {
      const result = await post("/api/admin/messages", {
        id: done.dataset.handled, handled: done.dataset.to === "true",
      });
      if (result) await loadMessages();
    }
  });

  root.addEventListener("submit", async (e) => {
    const ship = e.target.closest("[data-ship]");
    if (ship) {
      e.preventDefault();
      const result = await post("/api/admin/orders", {
        id: ship.dataset.ship, action: "ship", tracking: ship.tracking.value,
      });
      if (result) {
        // Still true. When the endpoint starts sending a dispatch email it
        // will say in its reply whether that worked, and this line reports
        // what actually happened rather than guessing.
        say("Marked dispatched — the customer is not told.");
        await loadOrders();
      }
      return;
    }

    const stock = e.target.closest("[data-stock]");
    if (stock) {
      e.preventDefault();
      const result = await post("/api/admin/stock", {
        sku: stock.dataset.stock, quantity: Number(stock.quantity.value),
      });
      if (result) say("Stock updated.");
      return;
    }
  });

  (async () => {
    try {
      await apiGet("/api/admin/orders");
    } catch (err) {
      /*
       * Only a 404 means "nothing here".
       *
       * 404 is deliberately both "no backend" and "not an admin", so this
       * page cannot be used to discover that admin exists — that part is
       * the point and stays. What was wrong is that every other failure got
       * the same answer: a database missing a column locked the entire
       * admin behind "Nothing to see here", which reads as "your account
       * lost its privileges" and sends you looking in the wrong place
       * entirely. A server fault is not a permissions answer, and the
       * endpoint's own message is the useful thing in the response.
       */
      const hidden = err?.message === API_MISSING;
      adminGate.innerHTML = `
        <p class="muted">${esc(hidden ? "Nothing to see here." : errorText(err))}</p>
        <p><a class="btn btn--ghost" href="/">Back to the shop</a></p>`;
      return;
    }
    adminGate.hidden = true;
    root.hidden = false;
    await loadOrders();
  })();
}
