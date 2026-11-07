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
  // Discount sits between Shipping and Total because without it the three
  // money columns do not add up on a discounted order, and a spreadsheet
  // that does not add up is one somebody reconciles by hand forever.
  "Items", "Subtotal", "Shipping", "Discount", "Code", "Total",
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
      // Orders placed before codes existed have no column value at all,
      // hence the fallback; they are genuinely zero, not unknown.
      rupees(o.discount_paise ?? 0),
      o.discount_code ?? "",
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
 * Oils on offer.
 *
 * A variant may carry `was`: the price it used to be, in rupees.
 *
 *     { size: "15 ml", price: 599, was: 699 }
 *
 * `price` is still the price. Nothing about what a customer is charged
 * changes — api/_lib/pricing.mjs reads `price` as it always did, so the
 * server keeps computing every rupee from the catalogue and a sale cannot
 * become a way to buy lavender for ₹1. `was` is display only.
 *
 * ---
 *
 * **`was` must be a price you actually charged.**
 *
 * A struck-through number that was never real is a misleading price, and
 * India's consumer-protection rules on dark patterns name exactly that
 * practice. The field is called `was`, not `mrp` or `compareAt`, because the
 * name should make the obligation obvious to whoever edits it next.
 *
 * Anything that is not a genuine reduction is ignored rather than rendered:
 * a `was` below or equal to `price` is a typo or an invention, and drawing
 * "₹699 ₹699" would be both.
 *
 * Shared with the browser the same way image.mjs is, because the shop grid
 * redraws client-side and a badge that only existed in the built HTML would
 * vanish the first time somebody filtered.
 */

/** The genuine reduction on a variant, or null. */
function saleOn(variant) {
  if (!variant) return null;

  const price = Number(variant.price);
  const was = Number(variant.was);

  if (!Number.isFinite(price) || !Number.isFinite(was)) return null;
  if (!(was > price)) return null;

  const off = was - price;
  return {
    was,
    price,
    off,
    // Rounded for display only. Nothing is computed from this.
    percent: Math.round((off / was) * 100),
  };
}

/** True when any size of this product is reduced. */
const onSale = (p) => (p?.variants ?? []).some((v) => saleOn(v));

/** The best percentage across a product's sizes, for a card badge. */
function bestSale(p) {
  const sales = (p?.variants ?? []).map(saleOn).filter(Boolean);
  if (!sales.length) return null;
  return sales.reduce((a, b) => (b.percent > a.percent ? b : a));
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
 * How much one order may contain.
 *
 * These are the shop's rules, and the server enforces them — api/_lib/pricing.mjs
 * refuses a cart that breaks either, because a limit the browser alone keeps
 * is not a limit at all.
 *
 * They live here, apart from the pricing, so the browser can read them too.
 * It could not before, and the result was a cart you were allowed to build
 * and not allowed to buy: with twenty-four bottles in stock the quantity
 * stepper went to twenty-four, and the checkout then refused anything over
 * ten with a message that arrived far too late to be useful.
 *
 * Shared with app.js the same way redirect, csv, image, sale and bottle are.
 */

/** Distinct products in one order. */
const MAX_LINES = 20;

/** Of any one product and size. */
const MAX_QTY_PER_LINE = 10;

/**
 * The most of this variant anyone may put in a cart.
 *
 * Whichever runs out first: the shelf, or the per-line rule. Returning the
 * smaller of the two is what lets the stepper stop in the right place and
 * say the right reason.
 */
const maxForVariant = (variant) =>
  Math.max(0, Math.min(Number(variant?.stock ?? 0), MAX_QTY_PER_LINE));

/**
 * Why the stepper stopped, for a message worth reading.
 *
 * "Only 3 left" and "10 is the most of one size" are different facts and a
 * shopper deserves the one that is true.
 */
function limitReason(variant, name = "", size = "") {
  const stock = Number(variant?.stock ?? 0);
  if (stock <= 0) return `${name} ${size} has sold out.`.trim();
  if (stock < MAX_QTY_PER_LINE) return `Only ${stock} of ${name} ${size} in stock.`.replace(/\s+/g, " ").trim();
  return `${MAX_QTY_PER_LINE} is the most of any one size per order.`;
}

/**
 * What a discount code is worth, and whether it may be used.
 *
 * Pure arithmetic and rules. No database, no request, no clock of its own —
 * the caller passes `now`, so a test can sit on either side of an expiry
 * without waiting. The server imports this to decide what to charge; the
 * admin page imports the same limits to refuse a code it would never accept.
 *
 * Money is integer paise throughout, like the rest of the shop.
 *
 * Two rules worth stating before the code, because both are decisions rather
 * than arithmetic:
 *
 *   Shipping is never discounted, and the free-shipping threshold is judged
 *   on the subtotal BEFORE the discount. A ₹1,050 cart with a 20% code keeps
 *   its free shipping. The alternative — discount first, then decide — hands
 *   someone a ₹210 saving and a ₹79 charge they did not have a moment ago,
 *   which reads as a trick even when the maths is honest.
 *
 *   A discount may never take the payable total below ₹1. Razorpay will not
 *   accept an order under a rupee, and `orders.total_paise` is checked > 0 in
 *   the schema, so a code that would zero a cart is capped rather than
 *   refused. The shopper is told what came off, which is the true number.
 */

/** Razorpay's floor, and the schema's. */
const MIN_PAYABLE_PAISE = 100;

/**
 * Half off is the most any code may be worth.
 *
 * Not a technical limit. It is the number that makes a mistyped "90" at the
 * admin screen a refusal rather than a weekend of selling at a tenth of
 * cost, and the shop has no margin data in it to check against anything
 * cleverer.
 */
const MAX_PERCENT = 50;

/** Letters, digits and hyphens. Long enough to not be guessed in a loop. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

const DISCOUNT_KINDS = ["percent", "fixed"];

/** A refusal the shopper can act on — safe to show them verbatim. */
class DiscountError extends Error {
  constructor(message, code = "invalid_code") {
    super(message);
    this.name = "DiscountError";
    this.code = code;
  }
}

/**
 * The canonical form of whatever was typed.
 *
 * Codes are printed on cards and read aloud, so they arrive with stray
 * spaces and in whatever case the keyboard was in. One spelling is stored
 * and compared; `diwali25`, ` Diwali25 ` and `DIWALI 25` are one code.
 */
const normalizeCode = (raw) =>
  String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");

/** `{ code }` or `{ error }` — the shape check, before any lookup. */
function readCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return { error: "Enter a code." };
  if (!CODE_PATTERN.test(code)) {
    return { error: "That doesn't look like one of our codes." };
  }
  return { code };
}

/**
 * Check what an admin typed, before it reaches the database.
 *
 * Returns `{ definition }` or `{ errors }` with every problem, not the first:
 * a form that reveals its objections one at a time is a form people fill in
 * four times.
 */
function parseDefinition(input = {}) {
  const errors = [];

  const { code, error: codeError } = readCode(input.code);
  if (codeError) errors.push(codeError);

  const kind = String(input.kind ?? "").trim();
  if (!DISCOUNT_KINDS.includes(kind)) errors.push("Choose a percentage or an amount off.");

  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 1) {
    errors.push("The value has to be a whole number of at least one.");
  } else if (kind === "percent" && value > MAX_PERCENT) {
    errors.push(`${MAX_PERCENT}% is the most a code may take off.`);
  }

  const minSubtotal = Number(input.minSubtotalPaise ?? 0);
  if (!Number.isInteger(minSubtotal) || minSubtotal < 0) {
    errors.push("The minimum spend has to be a whole number of paise, or nothing.");
  }

  /*
   * A fixed code worth more than its own minimum spend is the mistake that
   * costs money: ₹500 off with no minimum is a free ₹499 bottle. The rule is
   * that the minimum must leave at least a rupee payable, which is the same
   * floor the applied discount is capped at.
   */
  if (kind === "fixed" && Number.isInteger(value) && Number.isInteger(minSubtotal)) {
    if (minSubtotal < value + MIN_PAYABLE_PAISE) {
      errors.push("Set a minimum spend at least ₹1 above the amount off, or the code can empty a cart.");
    }
  }

  const maxRedemptions = input.maxRedemptions == null || input.maxRedemptions === ""
    ? null
    : Number(input.maxRedemptions);
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
    errors.push("A usage limit has to be a whole number of at least one, or left empty.");
  }

  let expiresAt = null;
  if (input.expiresAt) {
    expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) errors.push("That expiry date could not be read.");
  }

  if (errors.length) return { errors };
  return { definition: { code, kind, value, minSubtotalPaise: minSubtotal, maxRedemptions, expiresAt } };
}

/**
 * Why this code cannot be used on this cart, or null.
 *
 * `def` is a row as the database stores it, in snake_case, because that is
 * what the driver hands back and translating it twice is a place for a typo
 * to hide. Nothing here is worth a thrown error: the caller wants the reason.
 */
function refusalFor(def, subtotalPaise, now = new Date()) {
  if (!def) return new DiscountError("We don't recognise that code.", "unknown_code");

  if (def.active === false) {
    return new DiscountError("That code is no longer active.", "inactive_code");
  }
  if (def.expires_at && new Date(def.expires_at) <= now) {
    return new DiscountError("That code has expired.", "expired_code");
  }
  if (def.max_redemptions != null && Number(def.times_redeemed ?? 0) >= Number(def.max_redemptions)) {
    return new DiscountError("That code has been fully used.", "code_used_up");
  }
  if (subtotalPaise < Number(def.min_subtotal_paise ?? 0)) {
    const short = Number(def.min_subtotal_paise) / 100;
    return new DiscountError(
      `That code needs a basket of ₹${short.toLocaleString("en-IN")} or more.`,
      "below_minimum",
    );
  }
  return null;
}

/**
 * What comes off, in paise.
 *
 * A percentage is rounded to the nearest whole rupee, not to the paisa.
 *
 * That is a display decision as much as an arithmetic one. Every price in
 * this shop is a whole number of rupees, so until codes existed no total
 * ever had paise in it — and 10% of ₹699 is ₹69.90, which renders as
 * "₹69.9" and a total of "₹708.1". Both look like a bug to the person about
 * to pay. Rounding to the nearest rupee keeps the shop in whole rupees
 * everywhere, and rounding to the NEAREST rather than down means the
 * rounding falls the customer's way as often as not.
 */
function rawDiscountPaise(def, subtotalPaise) {
  if (def.kind === "percent") {
    const exact = (subtotalPaise * Number(def.value)) / 100;
    return Math.min(Math.round(exact / 100) * 100, subtotalPaise);
  }
  return Math.min(Number(def.value), subtotalPaise);
}

/**
 * Apply a code to a priced cart.
 *
 * Returns the discount and the new total, with the cap already applied.
 * Throws DiscountError if the code may not be used at all — the caller
 * answers 400 with the message.
 */
function applyDiscount({ subtotalPaise, shippingPaise }, def, now = new Date()) {
  const refusal = refusalFor(def, subtotalPaise, now);
  if (refusal) throw refusal;

  const gross = subtotalPaise + shippingPaise;
  const wanted = rawDiscountPaise(def, subtotalPaise);
  // Never below a rupee payable. See the header: capped, not refused.
  const discountPaise = Math.max(0, Math.min(wanted, gross - MIN_PAYABLE_PAISE));

  return {
    code: def.code,
    discountPaise,
    totalPaise: gross - discountPaise,
  };
}

/** "10% off" / "₹200 off" — one phrasing, used by the page and the admin list. */
const describeDiscount = (def) =>
  def.kind === "percent"
    ? `${def.value}% off`
    : `₹${(Number(def.value) / 100).toLocaleString("en-IN")} off`;

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
const fromPrice = (p) => Math.min(...p.variants.map((v) => v.price));
const inStock = (p) => p.variants.some((v) => v.stock > 0);
const firstAvailable = (p) => p.variants.find((v) => v.stock > 0) || p.variants[0];
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

/* ------------------------------------------------------------------ cart */
// Cart keys are "<productId>::<size>" so sizes are tracked separately.

const CART_KEY = "sarvha-cart-v1";

const lineProduct = (key) => byId(key.split("::")[0]);
function lineVariant(key) {
  const [id, size] = key.split("::");
  const p = byId(id);
  return p && p.variants.find((v) => v.size === size);
}

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY)) || {};
    return Object.fromEntries(Object.entries(raw).filter(([k]) => lineProduct(k) && lineVariant(k)));
  } catch {
    return {};
  }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

let cart = loadCart();

/*
 * Set by the checkout page, which is the one place that has to react to the
 * cart changing underneath it: it holds a quote from the server, and a quote
 * for a cart that no longer exists is a wrong number on a payment screen.
 * Null everywhere else, hence the optional call in renderCart.
 */
let cartChanged = null;

function addToCart(id, size, qty = 1) {
  const p = byId(id);
  if (!p) return;
  const variant = p.variants.find((v) => v.size === size) || firstAvailable(p);
  if (!variant || variant.stock <= 0) return toast(`${p.name} is sold out`);

  const key = `${id}::${variant.size}`;

  // An order holds twenty different oils. Said here rather than discovered
  // at checkout, which is where it used to be enforced and nowhere else.
  if (!(key in cart) && Object.keys(cart).length >= MAX_LINES) {
    return toast(`An order can hold ${MAX_LINES} different oils. Remove one first.`);
  }

  // Whichever runs out first, the shelf or the per-order rule. Clamping on
  // stock alone let ten be added on top of two and the cart reach twelve,
  // which the checkout would then refuse.
  const cap = maxForVariant(variant);
  const next = (cart[key] || 0) + qty;
  if (next > cap) {
    cart[key] = cap;
    toast(limitReason(variant, p.name, variant.size));
  } else {
    cart[key] = next;
    toast(`${p.name} ${p.variants.length > 1 ? variant.size + " " : ""}added to cart`);
  }
  saveCart();
  renderCart();
  bumpBadge();
}

function setQty(key, qty) {
  const variant = lineVariant(key);
  if (qty <= 0) delete cart[key];
  else cart[key] = Math.min(qty, variant ? maxForVariant(variant) : qty);
  saveCart();
  renderCart();
}

/*
 * The cart lives in the shop's chrome, which the admin page does not render.
 * These three touch nodes that only exist there, and two of them run at load
 * — so without a guard app.js throws on /admin/ before the admin code is
 * reached, and the page sits on "Checking…" forever with one line in the
 * console. Cheaper to ask than to assume.
 */
const hasCart = () => !!$("[data-cart-items]");

function bumpBadge() {
  if (!hasCart()) return;
  const badge = $("[data-cart-count]");
  badge.classList.remove("bump");
  void badge.offsetWidth;
  badge.classList.add("bump");
}

function renderCart() {
  if (!hasCart()) return;
  const lines = Object.entries(cart).filter(([k]) => lineProduct(k) && lineVariant(k));
  const count = lines.reduce((s, [, q]) => s + q, 0);
  const subtotal = lines.reduce((s, [k, q]) => s + lineVariant(k).price * q, 0);

  const badge = $("[data-cart-count]");
  badge.textContent = count;
  badge.hidden = count === 0;
  $("[data-cart-open]").setAttribute("aria-label", count ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart");
  $("[data-subtotal]").textContent = money(subtotal);
  $("[data-checkout]").disabled = !count;

  const remaining = C.freeShippingAt - subtotal;
  const pct = Math.min(100, (subtotal / C.freeShippingAt) * 100);
  const prog = $("[data-ship-progress]");
  prog.classList.toggle("is-unlocked", remaining <= 0);
  prog.innerHTML =
    (remaining > 0
      ? `You're <strong>${money(remaining)}</strong> away from free shipping`
      : `<strong>Free shipping unlocked</strong> — nice one.`) +
    `<div class="bar"><span style="width:${pct}%"></span></div>`;

  $("[data-cart-items]").innerHTML = lines.length
    ? lines.map(([key, q]) => {
        const p = lineProduct(key);
        const v = lineVariant(key);
        return `<div class="line">
          <a class="line__thumb" href="${p.url}" style="background:${p.bg}">${bottleSVG(p.swatch, "", key)}</a>
          <div class="line__main">
            <h5><a href="${p.url}">${esc(p.name)}</a></h5>
            <small class="muted">${v.size} · ${money(v.price)}</small>
            <div class="qty">
              <button data-qty="${key}" data-delta="-1" aria-label="Decrease quantity of ${esc(p.name)}">−</button>
              <span aria-live="polite">${q}</span>
              <button data-qty="${key}" data-delta="1" aria-label="Increase quantity of ${esc(p.name)}"${q >= maxForVariant(v) ? " disabled" : ""}>+</button>
            </div>
          </div>
          <div class="line__right">
            <strong>${money(v.price * q)}</strong>
            <button class="remove" data-remove="${key}">Remove</button>
          </div>
        </div>`;
      }).join("")
    : `<div class="empty">
         <p>Your cart is empty.</p>
         <p class="muted small">Add a few oils and they'll show up here.</p>
         <a class="btn btn--ghost" href="/shop/">Start shopping</a>
       </div>`;

  cartChanged?.();
}

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

function openCart() {
  lastFocused = document.activeElement;
  const d = $("[data-drawer]");
  d.hidden = false;
  requestAnimationFrame(() => d.classList.add("is-open"));
  $("[data-overlay]").classList.add("is-open");
  $("[data-cart-open]").setAttribute("aria-expanded", "true");
  document.body.classList.add("no-scroll");
  setTimeout(() => $("[data-cart-close]").focus(), 60);
}

function closeCart() {
  const d = $("[data-drawer]");
  if (!d.classList.contains("is-open")) return;
  d.classList.remove("is-open");
  $("[data-overlay]").classList.remove("is-open");
  $("[data-cart-open]").setAttribute("aria-expanded", "false");
  document.body.classList.remove("no-scroll");
  setTimeout(() => { d.hidden = true; }, 350);
  if (lastFocused) lastFocused.focus();
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
  if (!$("[data-drawer]").classList.contains("is-open")) {
    $("[data-overlay]").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }
  $("[data-menu-toggle]").setAttribute("aria-expanded", "false");
  if (lastFocused) lastFocused.focus();
}

/* ------------------------------------------------------ shop page filter */

const grid = $("[data-grid]");
const searchInput = $("[data-search-input]");
const state = { filter: "all", sort: "featured", query: "", family: "all", price: "all", inStock: false };

/* "0-499", "500-999", "2000-" → a test on a product's lowest price.
   Open-ended at the top because the range above ₹2,000 has no useful
   ceiling: rose absolute is ₹9,499 and would need its own band. */
function inPriceBand(p, band) {
  if (band === "all") return true;
  const [lo, hi] = band.split("-");
  const from = fromPrice(p);
  return from >= Number(lo) && (hi === "" || from <= Number(hi));
}

function matchesQuery(p, q) {
  if (!q) return true;
  // ?? "" because a set has no botanical name, and [a, undefined].join(" ")
  // puts the literal word "undefined" in the haystack — which then matches a
  // search for it.
  const hay = [p.name, p.botanical ?? "", p.tagline, p.notes.join(" "), catLabel(p.category)]
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
  const v = firstAvailable(p);
  const multi = p.variants.length > 1;
  const sold = !inStock(p);
  const low = !sold && v.stock > 0 && v.stock <= 8;
  const media = p.image
    // srcsetFor is prepended from src/image.mjs — the same function the build
    // uses. The grid re-renders here on filter, sort and live stock, so a
    // srcset only in the built HTML would vanish on the first interaction.
    ? `<img src="${p.image.src}"${srcsetFor(p.image.src)} alt="${esc(p.image.alt)}" width="900" height="1200"
         ${i < 4 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
         sizes="(max-width: 860px) 50vw, 25vw" data-pid="${p.id}" onerror="artFallback(this)" />`
    : bottleSVG(p.swatch, shortLabel(p), p.id);
  return `<article class="card${sold ? " is-sold" : ""}${bestSale(p) ? " is-sale" : ""}">
    <a class="card__media" style="background:${p.bg}" href="${p.url}" aria-label="View ${esc(p.name)}">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
      ${sold ? `<span class="badge badge--sold">Sold out</span>` : ""}
      ${media}
    </a>
    ${heartHTML(p)}
    <div class="card__body">
      <span class="card__meta">${catLabel(p.category)} · ${p.variants.map((x) => x.size).join(" / ")}</span>
      <h3 class="card__title"><a href="${p.url}">${esc(p.name)}</a></h3>
      <p class="card__latin">${p.botanical
        ? esc(p.botanical)
        : (p.contains ? `${p.contains.length} oils` : "")}</p>
      <p class="card__desc">${esc(p.tagline)}</p>
      ${low ? `<span class="stock-note">Only ${v.stock} left</span>` : ""}
      <div class="card__foot">
        <span class="card__price">${multi ? `<small>from </small>` : ""}<span class="price">${money(fromPrice(p))}</span>${
          bestSale(p) ? `<s class="price__was">${money(bestSale(p).was)}</s>` : ""}</span>
        ${sold
          ? `<button class="add-btn" disabled>Sold out</button>`
          : multi
            ? `<a class="add-btn" href="${p.url}">Choose size</a>`
            : `<button class="add-btn" data-add="${p.id}" data-size="${v.size}">Add to cart</button>`}
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  if (!grid) return;
  let list = C.products.filter((p) => state.filter === "all" || p.category === state.filter);
  list = list.filter((p) => matchesQuery(p, state.query));
  list = list.filter((p) => state.family === "all" || p.family === state.family);
  list = list.filter((p) => inPriceBand(p, state.price));
  // Stock is live from /api/stock, so this hides what is genuinely gone
  // rather than what the catalogue thought was gone at build time.
  if (state.inStock) list = list.filter((p) => inStock(p));
  if (state.sort === "featured") list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  if (state.sort === "price-asc") list = [...list].sort((a, b) => fromPrice(a) - fromPrice(b));
  if (state.sort === "price-desc") list = [...list].sort((a, b) => fromPrice(b) - fromPrice(a));
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
    if (state.price !== "all") bits.push(`at that price`);
    if (state.inStock) bits.push(`in stock`);
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
  put("price", state.price, "all");
  put("instock", state.inStock, false);
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
const priceSelect = $("[data-price]");
const stockToggle = $("[data-instock]");

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
  state.price = pick(priceSelect, params.get("price")) ?? "all";
  if (params.get("instock") === "true" && stockToggle) {
    stockToggle.checked = true;
    state.inStock = true;
  }
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
if (priceSelect) priceSelect.addEventListener("change", (e) => { state.price = e.target.value; renderGrid(); });
if (stockToggle) stockToggle.addEventListener("change", (e) => { state.inStock = e.target.checked; renderGrid(); });

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

/* ------------------------------------------------------------ product page */

// Exposed so the live-stock pass below can redraw the picker. Declared
// here rather than reached into, since it lives inside the block.
let pdpRefresh = null;

const pdp = $("[data-pdp]");
if (pdp) {
  const product = byId(pdp.dataset.pdp);
  let size = firstAvailable(product).size;
  let qty = 1;
  // Whether the shopper picked this size or we did. Live stock may move the
  // selection off a sold-out size, but only if they have not chosen one
  // themselves — silently changing someone's explicit choice is worse than
  // showing them it is unavailable.
  let chosen = false;

  const refresh = () => {
    // Build time renders each size disabled with "Sold out" in place of its
    // price. Live stock arrives afterwards and changes product.variants, so
    // that markup has to be kept in step here — otherwise an oil that sold
    // out since the last deploy still shows its price and looks buyable, and
    // only reveals itself when clicked.
    $$(".size", pdp).forEach((label) => {
      const input = $("input", label);
      const variant = product.variants.find((x) => x.size === input.value);
      const out = !variant || variant.stock <= 0;
      label.classList.toggle("is-sold", out);
      input.disabled = out;
      const price = $(".size__price", label);
      if (price) {
        const sale = saleOn(variant);
        price.innerHTML = out
          ? "Sold out"
          : money(variant.price) + (sale ? ` <s class="price__was">${money(sale.was)}</s>` : "");
      }
    });

    // If we picked this size and it has since sold out, move to one that has
    // not. Nothing to do if every size is gone — the button says so.
    const current = product.variants.find((x) => x.size === size);
    if (!chosen && current && current.stock <= 0) {
      const next = product.variants.find((x) => x.stock > 0);
      if (next) {
        size = next.size;
        qty = 1;
        const input = $$(".size input", pdp).find((i) => i.value === size);
        if (input) input.checked = true;
      }
    }

    const v = product.variants.find((x) => x.size === size);
    $("[data-qty-value]", pdp).textContent = qty;
    // The struck price scales with quantity too, or "₹1,198 ₹699" would
    // read as a two-for-one rather than a reduction.
    const sale = saleOn(v);
    $("[data-live-price]", pdp).innerHTML = money(v.price * qty)
      + (sale ? ` <s class="price__was">${money(sale.was * qty)}</s>` : "");
    const plus = $('[data-mqty="1"]', pdp);
    // Whichever runs out first, the shelf or the per-order rule. Capping on
    // stock alone let someone pick thirteen of something the checkout would
    // then refuse at ten.
    const cap = maxForVariant(v);
    plus.disabled = qty >= cap;
    const note = $("[data-stock-note]", pdp);
    // Show the reason only once it is about to bite, so the page is not
    // lecturing someone who wants one bottle.
    const nearCap = v.stock > 0 && (v.stock <= 8 || qty >= cap);
    note.hidden = !nearCap;
    note.textContent = nearCap ? limitReason(v, product.name, size) : "";
    $$(".size", pdp).forEach((l) => l.classList.toggle("is-active", $("input", l).value === size));
    const addBtn = $("[data-pdp-add]", pdp);
    addBtn.disabled = v.stock <= 0;
    addBtn.textContent = v.stock > 0 ? "Add to cart" : "Sold out";
  };

  pdp.addEventListener("change", (e) => {
    if (e.target.matches("[data-size-pick]")) { size = e.target.value; qty = 1; chosen = true; refresh(); }
  });

  pdp.addEventListener("click", (e) => {
    const step = e.target.closest("[data-mqty]");
    if (step) {
      const v = product.variants.find((x) => x.size === size);
      qty = Math.max(1, Math.min(maxForVariant(v), qty + +step.dataset.mqty));
      return refresh();
    }
    if (e.target.closest("[data-pdp-add]")) addToCart(product.id, size, qty);
  });

  pdpRefresh = refresh;
  refresh();
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

  const add = t.closest("[data-add]");
  if (add) { e.preventDefault(); return addToCart(add.dataset.add, add.dataset.size); }

  const save = t.closest("[data-save]");
  if (save) { e.preventDefault(); return toggleSaved(save.dataset.save); }

  const q = t.closest("[data-qty]");
  if (q) return setQty(q.dataset.qty, (cart[q.dataset.qty] || 0) + +q.dataset.delta);

  const rm = t.closest("[data-remove]");
  if (rm) return setQty(rm.dataset.remove, 0);

  if (t.closest("[data-reset-filters]")) {
    e.preventDefault();
    state.query = "";
    if (searchInput) searchInput.value = "";
    state.family = "all";
    state.price = "all";
    state.inStock = false;
    if (familySelect) familySelect.value = "all";
    if (priceSelect) priceSelect.value = "all";
    if (stockToggle) stockToggle.checked = false;
    return setFilter("all");
  }

  if (t.closest("[data-cart-open]")) return openCart();
  if (t.closest("[data-cart-close]")) return closeCart();
  if (t.closest("[data-menu-toggle]")) return openMenu();
  if (t.closest("[data-menu-close]")) return closeMenu();
  if (t === $("[data-overlay]")) { closeCart(); return closeMenu(); }
  if (t.closest("[data-nav] a")) return closeMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeCart(); closeMenu(); }
  if (e.key === "Tab") {
    if ($("[data-drawer]").classList.contains("is-open")) trapFocus($("[data-drawer]"), e);
    else if ($("[data-nav]").classList.contains("is-open")) trapFocus($("[data-nav]"), e);
  }
  if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    if (searchInput) { e.preventDefault(); searchInput.focus(); }
    else { e.preventDefault(); location.href = "/shop/#search"; }
  }
});

const checkoutBtn = $("[data-checkout]");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    // The checkout page handles the rest, including sending a logged-out
    // shopper to log in and bringing them back.
    location.href = "/checkout/";
  });
}

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

renderCart();

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

  try {
    return await res.json();
  } catch {
    throw new Error(res.ok ? API_MISSING : API_DOWN);
  }
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
/* ------------------------------------------------- forgotten password */
/*
 * Two small forms: ask for a link, and use one.
 *
 * Both say what actually happened. The request form reports the same thing
 * whether or not the address has an account — that is the endpoint's rule,
 * and repeating it here would be the place it quietly stopped being true, so
 * the message comes from the server.
 */

const forgotForm = $("[data-forgot-form]");
if (forgotForm) {
  const errorBox = $("[data-auth-error]", forgotForm);
  const submit = $("button[type=submit]", forgotForm);

  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = "Sending…";

    try {
      const result = await postJson("/api/auth/recover", {
        action: "request", email: forgotForm.email.value,
      });
      // Replace the form rather than leave it sitting there inviting a
      // second attempt at something that has already worked.
      forgotForm.innerHTML = `
        <p>${esc(result.message)}</p>
        <p class="muted small">It lasts an hour and works once. Check the spam folder
           if it has not arrived in a few minutes.</p>
        <p><a class="btn btn--ghost" href="/account/login/">Back to log in</a></p>`;
    } catch (err) {
      errorBox.textContent = errorText(err);
      errorBox.hidden = false;
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}

const resetForm = $("[data-reset-form]");
if (resetForm) {
  const errorBox = $("[data-auth-error]", resetForm);
  const submit = $("button[type=submit]", resetForm);
  const token = new URLSearchParams(location.search).get("token") ?? "";

  // No token at all is a link that was mangled in transit, or somebody
  // arriving here by hand. Say so before they type a password into a form
  // that cannot submit.
  if (!token) {
    resetForm.innerHTML = `
      <p>This link is missing its code, so it cannot be used.</p>
      <p><a class="btn btn--primary" href="/account/forgot/">Ask for a new one</a></p>`;
  }

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = "Setting…";

    try {
      const result = await postJson("/api/auth/recover", {
        action: "reset", token, password: resetForm.password.value,
      });

      setSignedIn(result.customer?.name ?? null);
      resetForm.innerHTML = `
        <p>Your password is set, and you are logged in.</p>
        ${result.sessionsEnded
          ? `<p class="muted small">Any other device that was signed in has been signed out.</p>`
          : ""}
        <p><a class="btn btn--primary" href="/account/">Go to your account</a></p>`;
    } catch (err) {
      errorBox.textContent = errorText(err);
      errorBox.hidden = false;
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}

const accountPanel = $("[data-account-panel]");

if (accountPanel) {
  const day = (iso) => new Date(iso).toLocaleDateString("en-IN",
    { day: "numeric", month: "long", year: "numeric" });

  /*
   * What the shop can honestly tell you about where your order is.
   *
   * Every one of these facts was already in the database and none of them
   * reached the person who most wanted them: a dispatched order said
   * "shipped" and stopped there, while the tracking reference the admin had
   * typed sat in a column nobody outside the admin page could see.
   *
   * There is deliberately no link to a courier's tracking page. We do not
   * record which courier carried which order, and guessing would send people
   * to a site that has never heard of their reference.
   */
  const orderStatus = (o) => {
    if (o.status === "oversold") {
      return `<p class="account__flag">We're short on part of this order and will be in touch.</p>`;
    }
    if (o.status === "shipped") {
      return `<p class="account__ship">Dispatched${
        o.shipped_at ? ` on ${day(o.shipped_at)}` : ""}.${
        o.tracking
          ? ` Tracking reference <span class="account__track">${esc(o.tracking)}</span>.`
          : ""}</p>`;
    }
    if (o.status === "paid") {
      return `<p class="account__prep">Paid for — we're packing it now.</p>`;
    }
    return "";
  };

  // Named rather than an IIFE so a save can redraw the panel with what the
  // server actually stored.
  async function renderAccount() {
    try {
      const data = await apiGet("/api/auth/session");

      setSignedIn(data.customer?.name ?? null);

      if (!data.customer) {
        accountPanel.innerHTML = `
          <header class="acct__head"><div>
            <p class="eyebrow">Your account</p>
            <h1>Your account</h1>
          </div></header>
          <p>You're not logged in.</p>
          <p class="muted"><a class="btn btn--primary" href="/account/login/">Log in</a></p>`;
        return;
      }

      const orders = data.orders ?? [];
      const addr = data.customer.address ?? {};

      /*
       * Panels, not a ladder of headings.
       *
       * This was four `<h2>`s at the page's full serif heading size stacked
       * down a 34rem column — orders, details, address, password — each
       * shouting as loudly as the page title, with nothing drawing a boundary
       * around what belonged to which. Now each section is a bordered card
       * with a small quiet label, and they sit two-up when there is room.
       */
      accountPanel.innerHTML = `
        <header class="acct__head">
          <div>
            <p class="eyebrow">Your account</p>
            <h1>${esc(data.customer.name)}</h1>
            <p class="acct__email">${esc(data.customer.email)}</p>
          </div>
          <button class="btn btn--ghost" data-logout>Log out</button>
        </header>

        <div class="acct__grid">
          <section class="acct__card acct__card--wide">
            <h2>Your orders</h2>
            ${orders.length
              ? `<ul class="account__orders">${orders.map((o) => `
                  <li class="account__order">
                    <div>
                      <strong>${day(o.created_at)}</strong>
                      <ul>${o.items.map((i) =>
                        `<li>${esc(i.name)} ${esc(i.size)} × ${i.qty}</li>`).join("")}</ul>
                      ${orderStatus(o)}
                    </div>
                    <strong>${money(o.total_paise / 100)}</strong>
                  </li>`).join("")}</ul>`
              : `<p class="muted">Nothing yet. <a href="/shop/">Have a look around</a>.</p>`}
          </section>

          <section class="acct__card">
            <h2>Your details</h2>
            <form class="account__form" data-account-form="profile">
              <label>Name
                <input name="name" type="text" required minlength="2"
                  value="${esc(data.customer.name)}" />
              </label>
              <label>Mobile
                <input name="phone" type="tel" placeholder="Optional"
                  value="${esc(data.customer.phone ?? "")}" />
              </label>
              <p class="account__fixed">Email: ${esc(data.customer.email)}
                <span class="muted">— get in touch if this needs changing.</span></p>
              <button class="btn btn--ghost" type="submit">Save details</button>
            </form>
          </section>

          <section class="acct__card">
            <h2>Delivery address</h2>
            <form class="account__form" data-account-form="address">
              <label>Address
                <input name="line1" type="text" required value="${esc(addr.line1 ?? "")}" />
              </label>
              <label>Address line 2
                <input name="line2" type="text" placeholder="Optional"
                  value="${esc(addr.line2 ?? "")}" />
              </label>
              <div class="acct__pair">
                <label>City
                  <input name="city" type="text" required value="${esc(addr.city ?? "")}" />
                </label>
                <label>PIN code
                  <input name="postcode" type="text" inputmode="numeric" required
                    value="${esc(addr.postcode ?? "")}" />
                </label>
              </div>
              <label>State
                <input name="state" type="text" required value="${esc(addr.state ?? "")}" />
              </label>
              <button class="btn btn--ghost" type="submit">Save address</button>
            </form>
          </section>

          <section class="acct__card">
            <h2>Password</h2>
            <form class="account__form" data-account-form="password">
              <label>Current password
                <input name="current" type="password" required autocomplete="current-password" />
              </label>
              <label>New password
                <input name="next" type="password" required minlength="10"
                  autocomplete="new-password" />
              </label>
              <p class="muted small">At least ten characters. Changing it signs you
                 out everywhere else, but not here.</p>
              <button class="btn btn--ghost" type="submit">Change password</button>
            </form>
          </section>
        </div>`;
    } catch (err) {
      accountPanel.innerHTML = `
        <header class="acct__head"><div>
          <p class="eyebrow">Your account</p>
          <h1>Your account</h1>
        </div></header>
        <p class="muted">${esc(apiMessage(err))}</p>
        <p><a class="btn btn--ghost" href="/shop/">Browse the oils</a></p>`;
    }
  }

  renderAccount();

  /*
   * Saving a change. Delegated on the panel, which renderAccount() replaces
   * wholesale, so a listener bound to a form would die with the form.
   *
   * postJson throws with the server's own message, which is what a bad
   * current password or a rejected PIN code needs to reach the person.
   */
  accountPanel.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-account-form]");
    if (!form) return;
    e.preventDefault();

    const action = form.dataset.accountForm;
    const button = $("button[type=submit]", form);
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Saving…";

    try {
      const result = await postJson("/api/auth/account", {
        action, ...Object.fromEntries(new FormData(form)),
      });

      if (action === "password") {
        toast(result.otherSessionsEnded
          ? `Password changed, and ${result.otherSessionsEnded} other session${
              result.otherSessionsEnded === 1 ? "" : "s"} ended.`
          : "Password changed.");
        form.reset();
        return;
      }

      toast(action === "address" ? "Address saved." : "Details saved.");
      if (result.customer?.name) setSignedIn(result.customer.name);
      // Redraw from the server, so a normalised phone number or a trimmed
      // address shows what will actually be on the parcel.
      renderAccount();
    } catch (err) {
      toast(errorText(err));
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });


  accountPanel.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-logout]")) return;
    await fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
    setSignedIn(null);
    location.href = "/";
  });
}

/* ------------------------------------------------------------- checkout */
/* The gate here is courtesy, not security: it saves a logged-out shopper
   from filling in an address only to be refused. api/checkout.js is what
   actually requires a session. */

const checkoutGate = $("[data-checkout-gate]");

if (checkoutGate) {
  const panel = $("[data-checkout-body]");
  const form = $("[data-checkout-form]");
  const errorBox = $("[data-checkout-error]");
  const payBtn = $("[data-pay]");

  const cartItems = () =>
    Object.entries(cart)
      .filter(([k]) => lineProduct(k) && lineVariant(k))
      .map(([key, qty]) => {
        const [id, size] = key.split("::");
        return { id, size, qty };
      });

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  /*
   * A code the server has confirmed, and the quote it gave for it.
   *
   * The browser never works out what a code is worth. It asks, and shows the
   * answer. That is not caution for its own sake: the discount table lives in
   * the database, so the only honest way to display a saving is to have been
   * told it, and doing it this way means the number on the summary and the
   * number charged came out of the same function on the same request.
   */
  let appliedCode = null;
  let quoted = null;

  const renderSummary = () => {
    const lines = Object.entries(cart).filter(([k]) => lineProduct(k) && lineVariant(k));
    const subtotal = lines.reduce((s, [k, q]) => s + lineVariant(k).price * q, 0);
    const ship = subtotal >= C.freeShippingAt ? 0 : C.shippingFlat;
    // The local sums are shown for reassurance only. Once a code has been
    // applied the server's quote replaces them, because it is the one with
    // the discount in it.
    const discount = quoted ? quoted.discountPaise / 100 : 0;
    const total = quoted ? quoted.totalPaise / 100 : subtotal + ship;

    $("[data-checkout-summary]").innerHTML = `
      <h2>Your order</h2>
      <ul class="checkout__lines">
        ${lines.map(([k, q]) => {
          const p = lineProduct(k), v = lineVariant(k);
          return `<li><span>${esc(p.name)} ${esc(v.size)} × ${q}</span>
                      <span>${money(v.price * q)}</span></li>`;
        }).join("")}
        ${discount > 0
          ? `<li class="checkout__discount"><span>Discount
               <code>${esc(appliedCode)}</code></span><span>−${money(discount)}</span></li>`
          : ""}
        <li><span>Shipping</span><span>${ship === 0 ? "Free" : money(ship)}</span></li>
        <li class="checkout__total"><span>Total</span><span>${money(total)}</span></li>
      </ul>`;
  };

  /* -------------------------------------------------------- discount code */

  const codeInput = $("[data-code-input]");
  const codeBtn = $("[data-code-apply]");
  const codeNote = $("[data-code-note]");

  const sayAboutCode = (message, ok) => {
    codeNote.textContent = message;
    codeNote.hidden = !message;
    codeNote.classList.toggle("is-ok", !!ok);
    codeNote.classList.toggle("is-bad", message && !ok);
  };

  const clearCode = () => {
    appliedCode = null;
    quoted = null;
    codeInput.value = "";
    codeInput.disabled = false;
    codeBtn.textContent = "Apply";
    sayAboutCode("", false);
    renderSummary();
  };

  async function applyCode() {
    // The same button removes it again. Two buttons for one slot, one of
    // them always doing nothing, is more chrome than this deserves.
    if (appliedCode) return clearCode();

    const typed = codeInput.value.trim();
    if (!typed) return sayAboutCode("Enter a code first.", false);

    codeBtn.disabled = true;
    codeBtn.textContent = "Checking…";
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        // preview: price it, tell us, create nothing.
        body: JSON.stringify({ preview: true, items: cartItems(), code: typed }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        location.href = "/account/login/?next=%2Fcheckout%2F";
        return;
      }
      if (!res.ok) {
        codeBtn.textContent = "Apply";
        return sayAboutCode(data.error || "That code could not be applied.", false);
      }

      quoted = data.summary;
      appliedCode = data.summary.code;
      codeInput.value = appliedCode;
      codeInput.disabled = true;
      codeBtn.textContent = "Remove";
      sayAboutCode(`${money(quoted.discountPaise / 100)} off applied.`, true);
      renderSummary();
    } catch {
      codeBtn.textContent = "Apply";
      sayAboutCode("We couldn't check that code. Please try again.", false);
    } finally {
      codeBtn.disabled = false;
    }
  }

  /*
   * The cart drawer is on this page too, so the order can be edited while a
   * quote is on screen. A discount worked out for a cart that no longer
   * exists is a wrong number sitting above a Pay button, so the code comes
   * off and the shopper is told why rather than silently re-quoted.
   */
  cartChanged = () => {
    if (!appliedCode) return renderSummary();
    clearCode();
    sayAboutCode("Your cart changed, so the code came off. Apply it again.", false);
  };

  if (codeBtn) {
    codeBtn.addEventListener("click", applyCode);
    // Enter in the code field applies the code. Without this it submits the
    // checkout form, which is a keystroke away from paying the undiscounted
    // total — the worst possible outcome of pressing Enter on a promo field.
    codeInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      applyCode();
    });
  }

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("razorpay script blocked"));
      document.head.appendChild(s);
    });

  (async () => {
    if (!cartItems().length) {
      checkoutGate.innerHTML = `
        <p>Your cart is empty.</p>
        <p><a class="btn btn--primary" href="/shop/">Start shopping</a></p>`;
      return;
    }

    let me = null;
    try {
      me = (await apiGet("/api/auth/session")).customer;
    } catch (err) {
      // Fail closed: no form, because an order could not be placed anyway.
      checkoutGate.innerHTML = `
        <p class="muted">${esc(apiMessage(err))}</p>
        <p><a class="btn btn--ghost" href="/shop/">Back to the shop</a></p>`;
      return;
    }

    setSignedIn(me?.name ?? null);

    if (!me) {
      checkoutGate.innerHTML = `
        <p>Please log in to place your order. It keeps your delivery details and
           gives you somewhere to see the order afterwards.</p>
        <p>
          <a class="btn btn--primary" href="/account/login/?next=%2Fcheckout%2F">Log in</a>
          <a class="btn btn--ghost" href="/account/register/?next=%2Fcheckout%2F">Create an account</a>
        </p>`;
      return;
    }

    // Prefill what the account already knows. For a returning customer that
    // is the whole form, and checkout becomes one button.
    form.name.value = me.name ?? "";
    form.phone.value = me.phone ?? "";
    if (me.address) {
      form.line1.value = me.address.line1 ?? "";
      form.line2.value = me.address.line2 ?? "";
      form.city.value = me.address.city ?? "";
      form.state.value = me.address.state ?? "";
      form.postcode.value = me.address.postcode ?? "";
    }

    checkoutGate.hidden = true;
    panel.hidden = false;
    renderSummary();
  })();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const f = Object.fromEntries(new FormData(form));
    const payload = {
      items: cartItems(),
      // Sent as the shopper's request, not as a settled fact. The server
      // looks the code up again and decides for itself; if the cart has
      // changed since the quote and the code no longer qualifies, it says so
      // and nothing is charged.
      code: appliedCode,
      name: f.name, phone: f.phone, notes: f.notes,
      address: {
        line1: f.line1, line2: f.line2, city: f.city,
        state: f.state, postcode: f.postcode,
      },
    };

    payBtn.disabled = true;
    payBtn.textContent = "Preparing…";

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        location.href = "/account/login/?next=%2Fcheckout%2F";
        return;
      }
      if (!res.ok) {
        showError(data.error || "We couldn't start that order.");
        return;
      }

      await loadRazorpay();

      const rz = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: "INR",
        name: "Sarvha",
        description: "Essential oils",
        prefill: { name: f.name, contact: f.phone },
        theme: { color: "#2f3d2b" },
        handler() {
          // Deliberately not "payment confirmed". This fires in the browser;
          // the order is settled by the webhook, which may land a moment
          // later. Claiming success here would sometimes be a lie.
          cart = {};
          saveCart();
          renderCart();
          sessionStorage.setItem("sarvha-last-order", data.orderId);
          location.href = "/checkout/thanks/";
        },
        modal: {
          ondismiss() {
            payBtn.disabled = false;
            payBtn.textContent = "Pay securely";
          },
        },
      });

      rz.on("payment.failed", (r) => {
        showError(r?.error?.description || "That payment didn't go through. Please try again.");
        payBtn.disabled = false;
        payBtn.textContent = "Pay securely";
      });

      rz.open();
      payBtn.textContent = "Pay securely";
    } catch (err) {
      showError(
        err?.message === "razorpay script blocked"
          ? "The payment window couldn't load. A browser extension may be blocking it."
          : "We couldn't reach the server. Please try again.",
      );
      payBtn.disabled = false;
      payBtn.textContent = "Pay securely";
    }
  });
}

const orderRef = $("[data-order-ref]");
if (orderRef) {
  const id = sessionStorage.getItem("sarvha-last-order");
  if (id) orderRef.textContent = `Order reference: ${id}`;
}

/* ---------------------------------------------------------- live stock */
/* Stock is baked into the page at build time, so between deploys a sold-out
   oil still looks available. /api/stock has the real numbers; this folds them
   in after load and re-renders what is on screen.

   Entirely optional. If the call fails — no backend, offline, blocked — the
   page keeps the built-in numbers and nobody sees an error. The server checks
   stock again at checkout regardless, so the worst case here is a shopper
   adding something they cannot buy, not an order we cannot fulfil. */

const skuFor = (p, v) =>
  `SRV-${p.id.replace(/-/g, "").slice(0, 7).toUpperCase()}-${v.size.replace(/\s/g, "").toUpperCase()}`;

(async () => {
  if (!C?.products?.length) return;

  let stock;
  try {
    stock = (await apiGet("/api/stock")).stock;
  } catch {
    return; // the built-in numbers stand
  }
  if (!stock) return;

  let changed = false;
  for (const p of C.products) {
    for (const v of p.variants) {
      const live = stock[skuFor(p, v)];
      if (Number.isInteger(live) && live !== v.stock) {
        v.stock = live;
        changed = true;
      }
    }
  }
  if (!changed) return;

  // Re-render whatever is showing. Each of these is a no-op off its own page.
  if (typeof renderGrid === "function" && $("[data-grid]")) renderGrid();
  // The saved page is a grid of cards too, and a bottle that sold out while
  // it sat on someone's list is exactly the case worth showing correctly.
  renderSavedGrid();
  if (pdpRefresh) pdpRefresh();
  if ($("[data-cart-items]")) renderCart();
})();

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
                      ${Number(o.discount_paise) > 0
                        ? `<p class="amuted">Discount ${esc(o.discount_code ?? "")}
                             −${rupees(o.discount_paise)}</p>` : ""}
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

  /**
   * Discount codes: the list, and the form that makes one.
   *
   * The form asks for rupees and the handler converts to paise before
   * sending, because nobody types a minimum spend in paise and a field that
   * wanted 99900 would eventually be given 999.
   */
  async function loadCodes() {
    const { codes } = await apiGet("/api/admin/orders?codes=1");

    /*
     * The badge answers "would this work if someone typed it", not "is the
     * active flag true".
     *
     * Those are different, and the first draft showed the flag: a code at
     * 5 of 5 uses and one that expired in January both sat there in green
     * saying ACTIVE, which is how you end up printing a dead code on a
     * flyer. refusalFor is the same function the checkout refuses with, so
     * this label cannot drift away from the behaviour. Infinity stands in
     * for the basket, because the minimum spend is the shopper's problem,
     * not a fact about the code.
     */
    const stateOf = (c) => {
      const refusal = refusalFor(c, Infinity);
      if (!refusal) return { label: "active", tone: "paid" };
      if (refusal.code === "inactive_code") return { label: "retired", tone: "oversold" };
      if (refusal.code === "expired_code") return { label: "expired", tone: "oversold" };
      return { label: "used up", tone: "oversold" };
    };

    const live = codes.filter((c) => !refusalFor(c, Infinity)).length;

    panel("codes").innerHTML = `
      <p class="astat">${live} usable · ${codes.length} in all</p>

      <div class="apanel">
        <form class="admin__code" data-code-new>
          <label>Code
            <input name="code" required placeholder="DIWALI10" autocapitalize="characters"
              autocomplete="off" spellcheck="false" />
          </label>
          <label>Type
            <select name="kind">
              <option value="percent">% off</option>
              <option value="fixed">₹ off</option>
            </select>
          </label>
          <label>Value
            <input name="value" type="number" min="1" required
              aria-describedby="code-help" />
          </label>
          <label>Min spend ₹
            <input name="minSubtotal" type="number" min="0" value="0" />
          </label>
          <label>Max uses
            <input name="maxRedemptions" type="number" min="1" placeholder="∞" />
          </label>
          <label>Expires
            <input name="expiresAt" type="date" />
          </label>
          <button class="abtn abtn--go" type="submit">Create</button>
          <p class="amuted" id="code-help">A percentage is whole percent, up to
            ${MAX_PERCENT}. An amount is in rupees, and needs a minimum spend above
            it so the code cannot empty a cart. A code cannot be edited once it
            exists — retire it and make another.</p>
        </form>
      </div>

      <div class="apanel">
        <table class="atable">
          <thead><tr>
            <th>Code</th><th>Worth</th><th>Conditions</th>
            <th class="atable--num">Used</th><th></th>
          </tr></thead>
          <tbody>${codes.length ? codes.map((c) => {
            const state = stateOf(c);
            return `
            <tr class="arow${state.label === "active" ? "" : " is-warn"}">
              <td><strong class="amono">${esc(c.code)}</strong>
                <span class="abadge abadge--${state.tone}">${state.label}</span></td>
              <td>${esc(describeDiscount(c))}</td>
              <td class="amuted">
                ${Number(c.min_subtotal_paise) > 0
                  ? `over ${money(Number(c.min_subtotal_paise) / 100)}` : "any basket"}${
                  c.expires_at ? ` · until ${date(c.expires_at)}` : ""}
              </td>
              <td class="atable--num">${c.times_redeemed}${
                c.max_redemptions != null ? ` / ${c.max_redemptions}` : ""}</td>
              <td>
                <button class="abtn" data-code-toggle="${esc(c.code)}"
                  data-to="${c.active ? "retire" : "revive"}">${
                  c.active ? "Retire" : "Revive"}</button>
              </td>
            </tr>`;
          }).join("")
            : `<tr><td colspan="5" class="amuted">No codes yet.</td></tr>`}</tbody>
        </table>
      </div>`;
  }

  const loaders = { orders: loadOrders, messages: loadMessages, stock: loadStock, codes: loadCodes };

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

    const codeToggle = e.target.closest("[data-code-toggle]");
    if (codeToggle) {
      const retiring = codeToggle.dataset.to === "retire";
      const result = await post("/api/admin/orders", {
        action: retiring ? "code-retire" : "code-revive",
        code: codeToggle.dataset.codeToggle,
      });
      if (result) {
        say(retiring ? "Code retired." : "Code is live again.");
        await loadCodes();
      }
      return;
    }

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

    const newCode = e.target.closest("[data-code-new]");
    if (newCode) {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(newCode));
      const result = await post("/api/admin/orders", {
        action: "code-create",
        code: f.code,
        kind: f.kind,
        // Rupees on screen, paise on the wire — for a fixed amount. A
        // percentage is a percentage and is sent as typed.
        value: f.kind === "fixed" ? Math.round(Number(f.value) * 100) : Number(f.value),
        minSubtotalPaise: Math.round(Number(f.minSubtotal || 0) * 100),
        maxRedemptions: f.maxRedemptions === "" ? null : Number(f.maxRedemptions),
        // A date input gives a day; a code is live to the end of it.
        expiresAt: f.expiresAt ? `${f.expiresAt}T23:59:59` : null,
      });
      if (result) {
        say(`${result.code} is live.`);
        await loadCodes();
      }
    }
  });

  (async () => {
    try {
      await apiGet("/api/admin/orders");
    } catch (err) {
      // 404 is both "no backend" and "not an admin" — deliberately the same
      // answer, so this page cannot be used to discover that admin exists.
      adminGate.innerHTML = `
        <p class="muted">${esc(err?.message === "offline" ? apiMessage(err) : "Nothing to see here.")}</p>
        <p><a class="btn btn--ghost" href="/">Back to the shop</a></p>`;
      return;
    }
    adminGate.hidden = true;
    root.hidden = false;
    await loadOrders();
  })();
}
