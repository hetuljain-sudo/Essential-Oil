/* =========================================================
   Sarvha — storefront
   All product data lives in PRODUCTS below. Edit that list
   to change what the shop sells; everything else follows.
   ========================================================= */

const STORE = {
  currency: "₹",
  locale: "en-IN",
  freeShippingAt: 999,
};

// ---------- Catalog ----------
// variants: [{ size, price, compareAt?, stock }]  — stock 0 marks sold out.
const PRODUCTS = [
  {
    id: "lavender", name: "Lavender", latin: "Lavandula angustifolia", type: "single",
    rating: 4.9, reviews: 612, badge: "Bestseller", color: "#9b87c4", bg: "#ece6f4",
    needs: ["sleep", "calm"], origin: "Bulgaria", method: "Steam distilled",
    desc: "Floral, soft and soothing. The classic wind-down oil.",
    notes: "Sweet, herbaceous, powdery",
    variants: [{ size: "10 ml", price: 449, stock: 24 }, { size: "30 ml", price: 1099, stock: 11 }],
  },
  {
    id: "peppermint", name: "Peppermint", latin: "Mentha piperita", type: "single",
    rating: 4.8, reviews: 401, color: "#4fa384", bg: "#e1f1ea",
    needs: ["energy", "focus"], origin: "India", method: "Steam distilled",
    desc: "Cool, sharp and invigorating. A natural pick-me-up.",
    notes: "Minty, crisp, cooling",
    variants: [{ size: "10 ml", price: 399, stock: 31 }, { size: "30 ml", price: 949, stock: 8 }],
  },
  {
    id: "tea-tree", name: "Tea Tree", latin: "Melaleuca alternifolia", type: "single",
    rating: 4.8, reviews: 355, color: "#6f8f4a", bg: "#e8eedd",
    needs: ["skin"], origin: "Australia", method: "Steam distilled",
    desc: "Fresh, medicinal and clarifying for skin care routines.",
    notes: "Camphoraceous, green, fresh",
    variants: [{ size: "10 ml", price: 379, stock: 18 }, { size: "30 ml", price: 899, stock: 6 }],
  },
  {
    id: "eucalyptus", name: "Eucalyptus", latin: "Eucalyptus globulus", type: "single",
    rating: 4.7, reviews: 288, color: "#5d9aa8", bg: "#e0eef1",
    needs: ["breathe", "energy"], origin: "India", method: "Steam distilled",
    desc: "Clean, camphoraceous and clearing. Great for steam.",
    notes: "Sharp, woody, medicinal",
    variants: [{ size: "10 ml", price: 349, stock: 27 }, { size: "30 ml", price: 829, stock: 9 }],
  },
  {
    id: "lemongrass", name: "Lemongrass", latin: "Cymbopogon flexuosus", type: "single",
    rating: 4.7, reviews: 190, color: "#b9b23f", bg: "#f2f0d8",
    needs: ["energy"], origin: "India", method: "Steam distilled",
    desc: "Bright, zesty and uplifting with an earthy edge.",
    notes: "Citrus, grassy, warm",
    variants: [{ size: "10 ml", price: 329, stock: 22 }, { size: "30 ml", price: 779, stock: 0 }],
  },
  {
    id: "rosemary", name: "Rosemary", latin: "Rosmarinus officinalis", type: "single",
    rating: 4.8, reviews: 524, badge: "Trending", color: "#58806a", bg: "#e2ece5",
    needs: ["hair", "focus"], origin: "Morocco", method: "Steam distilled",
    desc: "Herbaceous and fresh. A favourite for hair and scalp care.",
    notes: "Piney, herbal, bracing",
    variants: [{ size: "10 ml", price: 399, stock: 15 }, { size: "30 ml", price: 949, stock: 12 }],
  },
  {
    id: "sweet-orange", name: "Sweet Orange", latin: "Citrus sinensis", type: "single",
    rating: 4.7, reviews: 233, color: "#e08a3a", bg: "#f8e7d4",
    needs: ["energy", "calm"], origin: "Brazil", method: "Cold pressed",
    desc: "Juicy, sunny and cheerful. Loved by everyone.",
    notes: "Sweet citrus, bright, round",
    variants: [{ size: "10 ml", price: 299, stock: 40 }, { size: "30 ml", price: 699, stock: 17 }],
  },
  {
    id: "frankincense", name: "Frankincense", latin: "Boswellia serrata", type: "single",
    rating: 4.9, reviews: 147, badge: "Premium", color: "#a8875a", bg: "#efe6d8",
    needs: ["calm", "skin"], origin: "India", method: "Steam distilled",
    desc: "Warm, resinous and grounding. Ideal for meditation.",
    notes: "Resinous, balsamic, ancient",
    variants: [{ size: "10 ml", price: 899, stock: 7 }, { size: "30 ml", price: 2199, stock: 3 }],
  },
  {
    id: "deep-sleep", name: "Deep Sleep Blend", latin: "Lavender · Cedarwood · Vetiver", type: "blend",
    rating: 4.8, reviews: 309, color: "#5b5f9a", bg: "#e4e5f1",
    needs: ["sleep", "calm"], origin: "Blended in-house", method: "Hand blended",
    desc: "A calming bedtime blend to help you switch off.",
    notes: "Soft florals over warm wood",
    variants: [{ size: "10 ml", price: 549, stock: 19 }, { size: "30 ml", price: 1299, stock: 5 }],
  },
  {
    id: "focus", name: "Focus Blend", latin: "Rosemary · Peppermint · Lemon", type: "blend",
    rating: 4.7, reviews: 176, color: "#3f8a8c", bg: "#ddeeee",
    needs: ["focus", "energy"], origin: "Blended in-house", method: "Hand blended",
    desc: "Crisp and clarifying for work and study sessions.",
    notes: "Cool mint, citrus lift",
    variants: [{ size: "10 ml", price: 549, stock: 14 }, { size: "30 ml", price: 1299, stock: 4 }],
  },
  {
    id: "stress-relief", name: "Stress Relief Blend", latin: "Bergamot · Ylang Ylang · Lavender", type: "blend",
    rating: 4.8, reviews: 221, badge: "New", color: "#c17a8e", bg: "#f5e3e8",
    needs: ["calm", "sleep"], origin: "Blended in-house", method: "Hand blended",
    desc: "Soft, floral and citrusy to ease a busy mind.",
    notes: "Bergamot top, creamy floral heart",
    variants: [{ size: "10 ml", price: 549, stock: 21 }, { size: "30 ml", price: 1299, stock: 6 }],
  },
  {
    id: "jojoba", name: "Jojoba Carrier Oil", latin: "Simmondsia chinensis", type: "carrier",
    rating: 4.8, reviews: 198, color: "#d1b25c", bg: "#f5eed8",
    needs: ["skin", "hair"], origin: "Israel", method: "Cold pressed",
    desc: "Cold-pressed carrier for diluting oils safely on skin.",
    notes: "Odourless, light, non-greasy",
    variants: [{ size: "100 ml", price: 599, stock: 25 }, { size: "200 ml", price: 999, stock: 10 }],
  },
  {
    id: "starter-kit", name: "Essentials Starter Kit", latin: "6 × 10 ml best-sellers", type: "kit",
    rating: 4.9, reviews: 432, badge: "Save 16%", sale: true, color: "#2f3e2c", bg: "#e6dccb",
    needs: ["calm", "energy", "breathe", "skin"], origin: "Multiple", method: "Gift boxed",
    desc: "Lavender, Peppermint, Tea Tree, Eucalyptus, Lemongrass & Sweet Orange.",
    notes: "Our six most-loved oils",
    variants: [{ size: "6 × 10 ml", price: 1999, compareAt: 2394, stock: 12 }],
  },
];

const NEEDS = [
  { id: "sleep", label: "Sleep", note: "Wind down", icon: "☾", color: "#e4e5f1" },
  { id: "calm", label: "Calm", note: "Ease stress", icon: "❀", color: "#ece6f4" },
  { id: "energy", label: "Energy", note: "Feel uplifted", icon: "☀", color: "#f8e7d4" },
  { id: "focus", label: "Focus", note: "Stay sharp", icon: "◎", color: "#ddeeee" },
  { id: "skin", label: "Skin", note: "Clear & nourish", icon: "✿", color: "#e8eedd" },
  { id: "hair", label: "Hair", note: "Scalp care", icon: "❧", color: "#e2ece5" },
  { id: "breathe", label: "Breathe", note: "Clear the air", icon: "≋", color: "#e0eef1" },
];

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => STORE.currency + n.toLocaleString(STORE.locale);
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const needLabel = (id) => (NEEDS.find((n) => n.id === id) || { label: id }).label;
const fromPrice = (p) => Math.min(...p.variants.map((v) => v.price));
const inStock = (p) => p.variants.some((v) => v.stock > 0);
const firstAvailable = (p) => p.variants.find((v) => v.stock > 0) || p.variants[0];
const typeLabel = (t) => ({ single: "Essential oil", blend: "Blend", carrier: "Carrier oil", kit: "Gift kit" }[t] || t);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function bottleSVG(color, label = "") {
  const uid = "g" + Math.random().toString(36).slice(2, 8);
  return `
  <svg class="bottle" viewBox="0 0 80 160" aria-hidden="true" focusable="false">
    <rect x="30" y="2" width="20" height="10" rx="3" fill="#2a2a2a"/>
    <rect x="26" y="10" width="28" height="26" rx="4" fill="#1f1f1f"/>
    <rect x="29" y="14" width="3" height="18" rx="1.5" fill="#fff" opacity=".15"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="#7a3d12"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="url(#${uid})"/>
    <rect x="16" y="78" width="48" height="52" fill="${color}"/>
    <rect x="16" y="78" width="48" height="52" fill="#fff" opacity=".08"/>
    <text x="40" y="100" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="10" font-weight="600" fill="#fff">${esc(label)}</text>
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

const shortLabel = (p) => p.name.replace(/ (Blend|Carrier Oil|Oil|Kit)$/, "").replace("Essentials Starter", "Starter");

function toast(msg) {
  const t = $("[data-toast]");
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("is-show"), 2400);
}

// ---------- Static content ----------
$$("[data-money]").forEach((el) => (el.textContent = money(+el.dataset.money)));
$("[data-year]").textContent = new Date().getFullYear();

$("[data-hero-bottles]").innerHTML = ["lavender", "frankincense", "peppermint"]
  .map((id) => bottleSVG(byId(id).color, shortLabel(byId(id)))).join("");

$("[data-kit-art]").innerHTML = ["lavender", "peppermint", "tea-tree", "eucalyptus", "lemongrass", "sweet-orange"]
  .map((id) => bottleSVG(byId(id).color, shortLabel(byId(id)))).join("");

$("[data-moods]").innerHTML = NEEDS.map((n) => `
  <button class="mood" data-need="${n.id}">
    <span class="mood__dot" style="background:${n.color}" aria-hidden="true">${n.icon}</span>
    <span class="mood__label">${n.label}</span>
    <span class="mood__note">${n.note}</span>
  </button>`).join("");

// Structured data for the catalog
const ld = document.createElement("script");
ld.type = "application/ld+json";
ld.textContent = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: PRODUCTS.map((p, i) => ({
    "@type": "ListItem", position: i + 1,
    item: {
      "@type": "Product", name: p.name, description: p.desc, category: typeLabel(p.type),
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
      offers: p.variants.map((v) => ({
        "@type": "Offer", name: v.size, price: v.price, priceCurrency: "INR",
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      })),
    },
  })),
});
document.head.appendChild(ld);

// ---------- Grid ----------
const state = { filter: "all", need: null, sort: "featured", query: "" };

function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [p.name, p.latin, p.desc, p.notes, p.origin, ...p.needs.map(needLabel)].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

function visibleProducts() {
  let list = PRODUCTS.filter((p) => state.filter === "all" || p.type === state.filter);
  if (state.need) list = list.filter((p) => p.needs.includes(state.need));
  list = list.filter((p) => matchesQuery(p, state.query));
  if (state.sort === "price-asc") list = [...list].sort((a, b) => fromPrice(a) - fromPrice(b));
  if (state.sort === "price-desc") list = [...list].sort((a, b) => fromPrice(b) - fromPrice(a));
  if (state.sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
  return list;
}

function productCard(p) {
  const v = firstAvailable(p);
  const multi = p.variants.length > 1;
  const sold = !inStock(p);
  const low = !sold && v.stock > 0 && v.stock <= 8;
  return `
  <article class="card${sold ? " is-sold" : ""}">
    <button class="card__media" style="background:${p.bg}" data-view="${p.id}" aria-label="View details for ${esc(p.name)}">
      ${p.badge ? `<span class="badge${p.sale ? " badge--sale" : ""}">${p.badge}</span>` : ""}
      ${sold ? `<span class="badge badge--sold">Sold out</span>` : ""}
      ${bottleSVG(p.color, shortLabel(p))}
    </button>
    <div class="card__body">
      <span class="card__meta">${typeLabel(p.type)} · ${p.variants.map((x) => x.size).join(" / ")}</span>
      <h3 class="card__title"><button class="linkish" data-view="${p.id}">${esc(p.name)}</button></h3>
      <p class="card__desc">${esc(p.desc)}</p>
      <span class="card__rating"><b aria-hidden="true">★ ${p.rating}</b><span class="sr-only">Rated ${p.rating} out of 5</span> <span class="muted">(${p.reviews})</span></span>
      ${low ? `<span class="stock-note">Only ${v.stock} left</span>` : ""}
      <div class="card__foot">
        <span class="card__price">
          ${multi ? `<small>from </small>` : ""}<span class="price">${money(fromPrice(p))}</span>
          ${v.compareAt ? `<s>${money(v.compareAt)}</s>` : ""}
        </span>
        ${sold
          ? `<button class="add-btn" disabled>Sold out</button>`
          : multi
            ? `<button class="add-btn" data-view="${p.id}">Choose size</button>`
            : `<button class="add-btn" data-add="${p.id}" data-size="${v.size}">Add to cart</button>`}
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  const list = visibleProducts();
  $("[data-grid]").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="no-results">
         <p><strong>No oils match that.</strong></p>
         <p class="muted">Try a different word, or browse the whole collection.</p>
         <button class="btn btn--ghost" data-reset-filters>Clear filters</button>
       </div>`;

  const bits = [];
  if (state.need) bits.push(`for <strong>${needLabel(state.need)}</strong>`);
  if (state.query) bits.push(`matching “${esc(state.query)}”`);
  $("[data-result-count]").innerHTML =
    `${list.length} product${list.length === 1 ? "" : "s"}` +
    (bits.length ? ` ${bits.join(" ")} · <button class="linkish" data-reset-filters>clear</button>` : "");
}

function resetFilters() {
  state.need = null;
  state.query = "";
  state.filter = "all";
  $("[data-search-input]").value = "";
  $$("[data-filter]").forEach((b) => {
    const on = b.dataset.filter === "all";
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  renderGrid();
}

$("[data-filters]").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (!btn) return;
  $$("[data-filter]").forEach((b) => {
    const on = b === btn;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  state.filter = btn.dataset.filter;
  renderGrid();
});

$("[data-sort]").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderGrid();
});

let searchTimer;
$("[data-search-input]").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const val = e.target.value;
  searchTimer = setTimeout(() => {
    state.query = val.trim();
    renderGrid();
  }, 160);
});

$("[data-moods]").addEventListener("click", (e) => {
  const m = e.target.closest("[data-need]");
  if (!m) return;
  state.need = m.dataset.need;
  state.filter = "all";
  state.query = "";
  $("[data-search-input]").value = "";
  $$("[data-filter]").forEach((b) => {
    const on = b.dataset.filter === "all";
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  renderGrid();
  $("#shop").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
});

// ---------- Cart ----------
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
    // drop anything that no longer exists in the catalog
    return Object.fromEntries(Object.entries(raw).filter(([k]) => lineProduct(k) && lineVariant(k)));
  } catch {
    return {};
  }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

let cart = loadCart();

function addToCart(id, size, qty = 1) {
  const p = byId(id);
  if (!p) return;
  const variant = p.variants.find((v) => v.size === size) || firstAvailable(p);
  if (!variant || variant.stock <= 0) return toast(`${p.name} is sold out`);

  const key = `${id}::${variant.size}`;
  const next = (cart[key] || 0) + qty;
  if (next > variant.stock) {
    cart[key] = variant.stock;
    toast(`Only ${variant.stock} of ${p.name} ${variant.size} in stock`);
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
  else cart[key] = Math.min(qty, variant ? variant.stock : qty);
  saveCart();
  renderCart();
}

function bumpBadge() {
  const badge = $("[data-cart-count]");
  badge.classList.remove("bump");
  void badge.offsetWidth;
  badge.classList.add("bump");
}

function cartLines() {
  return Object.entries(cart).filter(([k]) => lineProduct(k) && lineVariant(k));
}

function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((s, [, q]) => s + q, 0);
  const subtotal = lines.reduce((s, [k, q]) => s + lineVariant(k).price * q, 0);

  const badge = $("[data-cart-count]");
  badge.textContent = count;
  badge.hidden = count === 0;
  $("[data-cart-open]").setAttribute("aria-label", count ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart");
  $("[data-subtotal]").textContent = money(subtotal);
  $("[data-checkout]").disabled = !count;

  const remaining = STORE.freeShippingAt - subtotal;
  const pct = Math.min(100, (subtotal / STORE.freeShippingAt) * 100);
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
        return `
        <div class="line">
          <div class="line__thumb" style="background:${p.bg}">${bottleSVG(p.color, "")}</div>
          <div class="line__main">
            <h5>${esc(p.name)}</h5>
            <small class="muted">${v.size} · ${money(v.price)}</small>
            <div class="qty">
              <button data-qty="${key}" data-delta="-1" aria-label="Decrease quantity of ${esc(p.name)}">−</button>
              <span aria-live="polite">${q}</span>
              <button data-qty="${key}" data-delta="1" aria-label="Increase quantity of ${esc(p.name)}"${q >= v.stock ? " disabled" : ""}>+</button>
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
         <button class="btn btn--ghost" data-cart-close>Start shopping</button>
       </div>`;
}

// ---------- Focus management ----------
let lastFocused = null;

function trapFocus(container, e) {
  const items = $$('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])', container)
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
  document.body.classList.add("no-scroll");
  setTimeout(() => $("[data-menu-close]").focus(), 60);
}

function closeMenu() {
  const nav = $("[data-nav]");
  if (!nav.classList.contains("is-open")) return;
  nav.classList.remove("is-open");
  if (!$("[data-drawer]").classList.contains("is-open")) {
    $("[data-overlay]").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }
  $("[data-menu-toggle]").setAttribute("aria-expanded", "false");
  if (lastFocused) lastFocused.focus();
}

// ---------- Product modal ----------
let modalProduct = null;
let modalSize = null;
let modalQty = 1;

function openModal(id) {
  const p = byId(id);
  if (!p) return;
  lastFocused = document.activeElement;
  modalProduct = p;
  modalSize = firstAvailable(p).size;
  modalQty = 1;
  renderModal();
  const m = $("[data-modal]");
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add("is-open"));
  document.body.classList.add("no-scroll");
  setTimeout(() => $("[data-modal-close]").focus(), 60);
}

function renderModal() {
  const p = modalProduct;
  const v = p.variants.find((x) => x.size === modalSize);
  const related = PRODUCTS.filter((x) => x.id !== p.id && x.needs.some((n) => p.needs.includes(n))).slice(0, 3);

  $("[data-modal-body]").innerHTML = `
    <button class="icon-btn modal__close" data-modal-close aria-label="Close product details">✕</button>
    <div class="modal__media" style="background:${p.bg}">${bottleSVG(p.color, shortLabel(p))}</div>
    <div class="modal__info">
      <p class="eyebrow">${typeLabel(p.type)}</p>
      <h3 id="modal-title">${esc(p.name)}</h3>
      <p class="latin">${esc(p.latin)}</p>
      <p class="card__rating"><b aria-hidden="true">★ ${p.rating}</b> <span class="muted">· ${p.reviews} reviews</span></p>
      <p class="modal__desc">${esc(p.desc)}</p>
      <div class="tags">${p.needs.map((n) => `<span class="tag">${needLabel(n)}</span>`).join("")}</div>

      ${p.variants.length > 1 ? `
      <fieldset class="sizes">
        <legend>Size</legend>
        ${p.variants.map((x) => `
          <label class="size${x.size === modalSize ? " is-active" : ""}${x.stock <= 0 ? " is-sold" : ""}">
            <input type="radio" name="size" value="${x.size}" ${x.size === modalSize ? "checked" : ""} ${x.stock <= 0 ? "disabled" : ""} data-size-pick />
            <span class="size__label">${x.size}</span>
            <span class="size__price">${x.stock > 0 ? money(x.price) : "Sold out"}</span>
          </label>`).join("")}
      </fieldset>` : ""}

      <dl class="specs">
        <dt>Origin</dt><dd>${esc(p.origin)}</dd>
        <dt>Method</dt><dd>${esc(p.method)}</dd>
        <dt>Aroma</dt><dd>${esc(p.notes)}</dd>
        <dt>Purity</dt><dd>100% pure, GC/MS tested</dd>
      </dl>

      <div class="modal__buy">
        <div class="qty qty--lg">
          <button data-mqty="-1" aria-label="Decrease quantity">−</button>
          <span aria-live="polite">${modalQty}</span>
          <button data-mqty="1" aria-label="Increase quantity" ${modalQty >= v.stock ? "disabled" : ""}>+</button>
        </div>
        <div class="modal__price">
          <span class="price">${money(v.price * modalQty)}</span>
          ${v.compareAt ? `<s>${money(v.compareAt * modalQty)}</s>` : ""}
        </div>
      </div>
      ${v.stock > 0 && v.stock <= 8 ? `<p class="stock-note">Only ${v.stock} left in this size</p>` : ""}
      <button class="btn btn--primary btn--block" ${v.stock <= 0 ? "disabled" : ""} data-modal-add>
        ${v.stock > 0 ? "Add to cart" : "Sold out"}
      </button>
      <p class="muted small modal__ship">Free shipping over ${money(STORE.freeShippingAt)} · 30-day happiness promise</p>

      ${related.length ? `
      <div class="related">
        <h4>Pairs well with</h4>
        <div class="related__row">
          ${related.map((r) => `
            <button class="related__item" data-view="${r.id}">
              <span class="related__thumb" style="background:${r.bg}">${bottleSVG(r.color, "")}</span>
              <span class="related__name">${esc(r.name)}</span>
              <span class="related__price muted">${money(fromPrice(r))}</span>
            </button>`).join("")}
        </div>
      </div>` : ""}
    </div>`;
}

function closeModal() {
  const m = $("[data-modal]");
  if (!m.classList.contains("is-open")) return;
  m.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  setTimeout(() => { m.hidden = true; }, 300);
  modalProduct = null;
  if (lastFocused) lastFocused.focus();
}

// ---------- Events ----------
document.addEventListener("click", (e) => {
  const t = e.target;

  const view = t.closest("[data-view]");
  if (view) { e.preventDefault(); return openModal(view.dataset.view); }

  const add = t.closest("[data-add]");
  if (add) return addToCart(add.dataset.add, add.dataset.size);

  if (t.closest("[data-modal-add]")) {
    addToCart(modalProduct.id, modalSize, modalQty);
    return closeModal();
  }

  const mq = t.closest("[data-mqty]");
  if (mq) {
    const v = modalProduct.variants.find((x) => x.size === modalSize);
    modalQty = Math.max(1, Math.min(v.stock, modalQty + +mq.dataset.mqty));
    return renderModal();
  }

  const q = t.closest("[data-qty]");
  if (q) return setQty(q.dataset.qty, (cart[q.dataset.qty] || 0) + +q.dataset.delta);

  const rm = t.closest("[data-remove]");
  if (rm) return setQty(rm.dataset.remove, 0);

  if (t.closest("[data-reset-filters]")) { e.preventDefault(); return resetFilters(); }

  if (t.closest("[data-cart-open]")) return openCart();
  if (t.closest("[data-cart-close]")) return closeCart();
  if (t.closest("[data-menu-toggle]")) return openMenu();
  if (t.closest("[data-menu-close]")) return closeMenu();
  if (t.closest("[data-modal-close]") || t === $("[data-modal]")) return closeModal();

  if (t === $("[data-overlay]")) { closeCart(); return closeMenu(); }

  if (t.closest("[data-search-open]")) {
    $("#shop").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    return setTimeout(() => $("[data-search-input]").focus(), 400);
  }

  if (t.closest("[data-nav] a")) return closeMenu();
});

// Size picker inside the modal
document.addEventListener("change", (e) => {
  if (e.target.matches("[data-size-pick]")) {
    modalSize = e.target.value;
    modalQty = 1;
    renderModal();
    $('[data-size-pick][value="' + modalSize + '"]').focus();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModal(); closeCart(); closeMenu(); }

  if (e.key === "Tab") {
    if ($("[data-modal]").classList.contains("is-open")) trapFocus($("[data-modal-body]"), e);
    else if ($("[data-drawer]").classList.contains("is-open")) trapFocus($("[data-drawer]"), e);
    else if ($("[data-nav]").classList.contains("is-open")) trapFocus($("[data-nav]"), e);
  }

  // "/" focuses search, the way most storefronts do
  if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    e.preventDefault();
    $("#shop").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    setTimeout(() => $("[data-search-input]").focus(), 400);
  }
});

$("[data-checkout]").addEventListener("click", () => {
  // Backend hook: create an order here and hand off to your payment gateway.
  toast("Checkout coming soon — no payment gateway connected yet");
});

$("[data-newsletter]").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = e.target.querySelector("input");
  if (!input.checkValidity()) return toast("Please enter a valid email address");
  e.target.reset();
  toast("Thanks! Check your inbox for your 10% code.");
});

// ---------- Motion & polish ----------
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const header = $("[data-header]");
let lastY = 0;
addEventListener("scroll", () => {
  const y = window.scrollY;
  header.classList.toggle("is-stuck", y > 10);
  lastY = y;
}, { passive: true });

if (!prefersReducedMotion() && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  $$("[data-reveal]").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
}

// ---------- Boot ----------
renderGrid();
renderCart();
