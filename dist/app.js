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
const money = (n) => C.currency + n.toLocaleString(C.locale);
const byId = (id) => C.products.find((p) => p.id === id);
const catLabel = (id) => (C.categories.find((c) => c.id === id) || { label: id }).label;
const fromPrice = (p) => Math.min(...p.variants.map((v) => v.price));
const inStock = (p) => p.variants.some((v) => v.stock > 0);
const firstAvailable = (p) => p.variants.find((v) => v.stock > 0) || p.variants[0];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const shortLabel = (p) => p.short || p.name.split(" ")[0];

function bottleSVG([light, dark], label = "") {
  const uid = "g" + Math.random().toString(36).slice(2, 8);
  return `<svg class="bottle" viewBox="0 0 80 160" aria-hidden="true" focusable="false">
    <rect x="30" y="2" width="20" height="10" rx="3" fill="#2a2a2a"/>
    <rect x="26" y="10" width="28" height="26" rx="4" fill="#1f1f1f"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="#7a3d12"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="url(#${uid})"/>
    <rect x="16" y="78" width="48" height="52" fill="${light}"/>
    <rect x="16" y="78" width="48" height="52" fill="${dark}" opacity=".35"/>
    <text x="40" y="102" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="10" font-weight="600" fill="#fff">${esc(label)}</text>
    <rect x="20" y="70" width="3" height="70" rx="1.5" fill="#fff" opacity=".18"/>
    <defs><linearGradient id="${uid}" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
      <stop offset=".5" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient></defs>
  </svg>`;
}

/** Photography that fails to load is replaced with generated bottle art. */
window.artFallback = function (img) {
  const p = byId(img.dataset.pid);
  const holder = img.parentElement;
  img.remove();
  if (p && !holder.querySelector(".bottle")) {
    holder.insertAdjacentHTML("beforeend", bottleSVG(p.swatch, shortLabel(p)));
    holder.classList.add("has-art");
  }
};

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

function renderCart() {
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
          <a class="line__thumb" href="${p.url}" style="background:${p.bg}">${bottleSVG(p.swatch, "")}</a>
          <div class="line__main">
            <h5><a href="${p.url}">${esc(p.name)}</a></h5>
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
         <a class="btn btn--ghost" href="/shop/">Start shopping</a>
       </div>`;
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
const state = { filter: "all", sort: "featured", query: "" };

function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [p.name, p.botanical, p.tagline, p.notes.join(" "), catLabel(p.category)].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

function productCard(p) {
  const v = firstAvailable(p);
  const multi = p.variants.length > 1;
  const sold = !inStock(p);
  const low = !sold && v.stock > 0 && v.stock <= 8;
  const media = p.image
    ? `<img src="${p.image.src}" alt="${esc(p.image.alt)}" width="900" height="1200"
         loading="lazy" decoding="async"
         sizes="(max-width: 860px) 50vw, 25vw" data-pid="${p.id}" onerror="artFallback(this)" />`
    : bottleSVG(p.swatch, shortLabel(p));
  return `<article class="card${sold ? " is-sold" : ""}">
    <a class="card__media" style="background:${p.bg}" href="${p.url}" aria-label="View ${esc(p.name)}">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
      ${sold ? `<span class="badge badge--sold">Sold out</span>` : ""}
      ${media}
    </a>
    <div class="card__body">
      <span class="card__meta">${catLabel(p.category)} · ${p.variants.map((x) => x.size).join(" / ")}</span>
      <h3 class="card__title"><a href="${p.url}">${esc(p.name)}</a></h3>
      <p class="card__latin">${esc(p.botanical)}</p>
      <p class="card__desc">${esc(p.tagline)}</p>
      ${low ? `<span class="stock-note">Only ${v.stock} left</span>` : ""}
      <div class="card__foot">
        <span class="card__price">${multi ? `<small>from </small>` : ""}<span class="price">${money(fromPrice(p))}</span></span>
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
  if (state.sort === "featured") list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  if (state.sort === "price-asc") list = [...list].sort((a, b) => fromPrice(a) - fromPrice(b));
  if (state.sort === "price-desc") list = [...list].sort((a, b) => fromPrice(b) - fromPrice(a));
  if (state.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  grid.innerHTML = list.length
    ? `<div class="grid">${list.map(productCard).join("")}</div>`
    : `<div class="no-results">
         <p><strong>No oils match that.</strong></p>
         <p class="muted">Try a different word, or browse the whole collection.</p>
         <button class="btn btn--ghost" data-reset-filters>Clear filters</button>
       </div>`;

  const counter = $("[data-result-count]");
  if (counter) {
    const bits = [];
    if (state.filter !== "all") bits.push(`in <strong>${catLabel(state.filter)}</strong>`);
    if (state.query) bits.push(`matching “${esc(state.query)}”`);
    counter.innerHTML = `${list.length} oil${list.length === 1 ? "" : "s"}` +
      (bits.length ? ` ${bits.join(" ")} · <button class="linkish" data-reset-filters>clear</button>` : "");
  }

  // Keep the URL shareable: /shop/?collection=energy
  const url = new URL(location.href);
  if (state.filter === "all") url.searchParams.delete("collection");
  else url.searchParams.set("collection", state.filter);
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

const pdp = $("[data-pdp]");
if (pdp) {
  const product = byId(pdp.dataset.pdp);
  let size = firstAvailable(product).size;
  let qty = 1;

  const refresh = () => {
    const v = product.variants.find((x) => x.size === size);
    $("[data-qty-value]", pdp).textContent = qty;
    $("[data-live-price]", pdp).textContent = money(v.price * qty);
    const plus = $('[data-mqty="1"]', pdp);
    plus.disabled = qty >= v.stock;
    const note = $("[data-stock-note]", pdp);
    note.hidden = !(v.stock > 0 && v.stock <= 8);
    note.textContent = v.stock > 0 ? `Only ${v.stock} left` : "";
    $$(".size", pdp).forEach((l) => l.classList.toggle("is-active", $("input", l).value === size));
    const addBtn = $("[data-pdp-add]", pdp);
    addBtn.disabled = v.stock <= 0;
    addBtn.textContent = v.stock > 0 ? "Add to cart" : "Sold out";
  };

  pdp.addEventListener("change", (e) => {
    if (e.target.matches("[data-size-pick]")) { size = e.target.value; qty = 1; refresh(); }
  });

  pdp.addEventListener("click", (e) => {
    const step = e.target.closest("[data-mqty]");
    if (step) {
      const v = product.variants.find((x) => x.size === size);
      qty = Math.max(1, Math.min(v.stock, qty + +step.dataset.mqty));
      return refresh();
    }
    if (e.target.closest("[data-pdp-add]")) addToCart(product.id, size, qty);
  });

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

/* ---------------------------------------------------------------- events */

document.addEventListener("click", (e) => {
  const t = e.target;

  const add = t.closest("[data-add]");
  if (add) { e.preventDefault(); return addToCart(add.dataset.add, add.dataset.size); }

  const q = t.closest("[data-qty]");
  if (q) return setQty(q.dataset.qty, (cart[q.dataset.qty] || 0) + +q.dataset.delta);

  const rm = t.closest("[data-remove]");
  if (rm) return setQty(rm.dataset.remove, 0);

  if (t.closest("[data-reset-filters]")) {
    e.preventDefault();
    state.query = "";
    if (searchInput) searchInput.value = "";
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

$("[data-checkout]").addEventListener("click", () => {
  // Backend hook: create an order here and hand off to your payment gateway.
  toast("Checkout coming soon — no payment gateway connected yet");
});

const news = $("[data-newsletter]");
if (news) news.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = e.target.querySelector("input");
  if (!input.checkValidity()) return toast("Please enter a valid email address");
  e.target.reset();
  toast("Thanks! Check your inbox for your 10% code.");
});

const contact = $("[data-contact]");
if (contact) contact.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!e.target.checkValidity()) return toast("Please fill in every required field");
  e.target.reset();
  toast("Thanks — we'll be in touch shortly.");
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
