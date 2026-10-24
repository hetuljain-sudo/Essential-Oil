/** Shared page chrome and components. Every page is assembled from these. */

import {
  site, nav, categories, products, library, faqs, steps,
  fromPrice, inStock, firstAvailable, categoryOf, money,
} from "./data.mjs";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const shortLabel = (p) => p.short || p.name.split(" ")[0];

/** Generated bottle artwork — the fallback when photography fails to load. */
export function bottleSVG([light, dark], label = "") {
  const uid = "g" + Math.random().toString(36).slice(2, 8);
  return `<svg class="bottle" viewBox="0 0 80 160" aria-hidden="true" focusable="false">
    <rect x="30" y="2" width="20" height="10" rx="3" fill="#2a2a2a"/>
    <rect x="26" y="10" width="28" height="26" rx="4" fill="#1f1f1f"/>
    <rect x="29" y="14" width="3" height="18" rx="1.5" fill="#fff" opacity=".15"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="#7a3d12"/>
    <path d="M30 36h20v6c0 4 14 8 14 20v82a12 12 0 0 1-12 12H28a12 12 0 0 1-12-12V62c0-12 14-16 14-20z" fill="url(#${uid})"/>
    <rect x="16" y="78" width="48" height="52" fill="${light}"/>
    <rect x="16" y="78" width="48" height="52" fill="${dark}" opacity=".35"/>
    <text x="40" y="102" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="10" font-weight="600" fill="#fff">${esc(label)}</text>
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

export function productMedia(p, sizes = "(max-width: 860px) 50vw, 25vw", eager = false) {
  if (!p.image) return bottleSVG(p.swatch, shortLabel(p));
  return `<img src="${p.image.src}" alt="${esc(p.image.alt)}" ${eager ? '' : 'loading="lazy"'} decoding="async"
    sizes="${sizes}" data-pid="${p.id}" onerror="artFallback(this)" />`;
}

/** Products with no photography render the generated art, which needs the
 *  same sizing the runtime fallback applies. */
export const mediaClass = (p) => (p.image ? "" : " has-art");

export const productUrl = (p) => `/oils/${p.id}/`;
export const categoryUrl = (c) => `/collections/${c.id}/`;

/** A card in any product grid. */
export function productCard(p) {
  const v = firstAvailable(p);
  const multi = p.variants.length > 1;
  const sold = !inStock(p);
  const low = !sold && v.stock > 0 && v.stock <= 8;
  return `<article class="card${sold ? " is-sold" : ""}">
    <a class="card__media${mediaClass(p)}" style="background:${p.bg}" href="${productUrl(p)}" aria-label="View ${esc(p.name)}">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
      ${sold ? `<span class="badge badge--sold">Sold out</span>` : ""}
      ${productMedia(p)}
    </a>
    <div class="card__body">
      <span class="card__meta">${categoryOf(p.category).label} · ${p.variants.map((x) => x.size).join(" / ")}</span>
      <h3 class="card__title"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
      <p class="card__latin">${esc(p.botanical)}</p>
      <p class="card__desc">${esc(p.tagline)}</p>
      ${low ? `<span class="stock-note">Only ${v.stock} left</span>` : ""}
      <div class="card__foot">
        <span class="card__price">${multi ? `<small>from </small>` : ""}<span class="price">${money(fromPrice(p))}</span></span>
        ${sold
          ? `<button class="add-btn" disabled>Sold out</button>`
          : multi
            ? `<a class="add-btn" href="${productUrl(p)}">Choose size</a>`
            : `<button class="add-btn" data-add="${p.id}" data-size="${v.size}">Add to cart</button>`}
      </div>
    </div>
  </article>`;
}

export const productGrid = (list, mod = "") =>
  `<div class="grid${mod ? " " + mod : ""}">${list.map(productCard).join("")}</div>`;

export function breadcrumbs(trail) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>
    ${trail.map((t, i) =>
      i === trail.length - 1
        ? `<li aria-current="page">${esc(t.label)}</li>`
        : `<li><a href="${t.href}">${esc(t.label)}</a></li>`
    ).join("")}
  </ol></nav>`;
}

/* ---------------------------------------------------------------- chrome */

function header(current) {
  return `<header class="header" data-header>
    <div class="container header__inner">
      <button class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav" data-menu-toggle>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
      </button>

      <a href="/" class="logo" aria-label="${site.name} home">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M16 3c5 6 8 10.5 8 15a8 8 0 0 1-16 0c0-4.5 3-9 8-15z" fill="currentColor" opacity=".18"/><path d="M16 3c5 6 8 10.5 8 15a8 8 0 0 1-16 0c0-4.5 3-9 8-15zM16 12v14M16 18l-4-3M16 22l4-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
        <span>${site.name}</span>
      </a>

      <nav class="nav" id="site-nav" data-nav aria-label="Main">
        <button class="icon-btn nav__close" aria-label="Close menu" data-menu-close>✕</button>
        ${nav.map((l) =>
          `<a href="${l.href}"${current === l.href ? ' aria-current="page"' : ""}>${l.label}</a>`
        ).join("")}
      </nav>

      <a class="icon-btn search-btn" href="/shop/#search" aria-label="Search products">
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      </a>

      <button class="icon-btn cart-btn" aria-label="Open cart" aria-expanded="false" data-cart-open>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8zM9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>
        <span class="cart-count" data-cart-count hidden>0</span>
      </button>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <a href="/" class="logo logo--light"><span>${site.name}</span></a>
        <p>${esc(site.tagline)}. Shipped across India.</p>
        <address class="footer__contact">
          <a href="mailto:${site.email}">${site.email}</a>
          ${site.phones.map((n) =>
            `<a href="tel:${n.replace(/\s/g, "")}">${n}</a>`).join("")}
          <span>${site.address.lines.join("<br />")}<br />
          ${site.address.city} &ndash; ${site.address.postcode}<br />
          ${site.address.country}</span>
        </address>
      </div>
      <nav aria-label="Shop links">
        <h4>Shop</h4>
        <a href="/shop/">All oils</a>
        ${categories.map((c) => `<a href="${categoryUrl(c)}">${c.label}</a>`).join("")}
      </nav>
      <nav aria-label="Company links">
        <h4>Company</h4>
        <a href="/about/">Our story</a><a href="/collections/">Collections</a><a href="/contact/">Contact</a>
      </nav>
      <nav aria-label="Help links">
        <h4>Help</h4>
        <a href="/faq/">FAQ</a><a href="/faq/#usage-safety">Safety &amp; dilution</a><a href="/faq/#shipping-delivery">Shipping</a>
      </nav>
    </div>
    <div class="container footer__base">© <span data-year></span> ${site.name}. All rights reserved.</div>
  </footer>`;
}

const drawerAndModal = `
  <div class="overlay" data-overlay></div>
  <aside class="drawer" data-drawer role="dialog" aria-modal="true" aria-label="Shopping cart" tabindex="-1" hidden>
    <div class="drawer__head">
      <h3>Your cart</h3>
      <button class="icon-btn" aria-label="Close cart" data-cart-close>✕</button>
    </div>
    <div class="ship-progress" data-ship-progress></div>
    <div class="drawer__items" data-cart-items></div>
    <div class="drawer__foot">
      <div class="drawer__row"><span>Subtotal</span><strong data-subtotal></strong></div>
      <p class="muted small">Taxes and shipping calculated at checkout.</p>
      <button class="btn btn--primary btn--block" data-checkout>Checkout</button>
    </div>
  </aside>
  <div class="toast" data-toast role="status" aria-live="polite"></div>`;

/* ---------------------------------------------------------------- layout */

export function layout({ title, description, path, body, jsonLd, bodyClass = "" }) {
  const fullTitle = path === "/" ? title : `${title} — ${site.name}`;
  const canonical = site.url + path;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="theme-color" content="#2f3e2c" />
  <meta name="color-scheme" content="light" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${site.name}" />
  <meta property="og:title" content="${esc(fullTitle)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232f3e2c'/%3E%3Cpath d='M16 6c4.5 5.4 7 9.4 7 13.3a7 7 0 0 1-14 0C9 15.4 11.5 11.4 16 6z' fill='%23b5653b'/%3E%3C/svg%3E" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://images.unsplash.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
  <a href="#main" class="skip-link">Skip to content</a>
  <div class="announce">Free shipping on orders over ${money(site.freeShippingAt)} · 100% pure, undiluted oils</div>
  ${header(path)}
  <main id="main">${body}</main>
  ${footer()}
  ${drawerAndModal}
  <script src="/catalog.js"></script>
  <script src="/app.js"></script>
</body>
</html>`;
}

/* ------------------------------------------------------------ components */

export const newsletter = () => `
  <section class="newsletter">
    <div class="container newsletter__inner">
      <div>
        <h2>Get 10% off your first order</h2>
        <p>Blending recipes, new arrivals and the occasional offer. No more than once a month.</p>
      </div>
      <form class="newsletter__form" data-newsletter novalidate>
        <input type="email" required placeholder="Your email address" aria-label="Email address" />
        <button class="btn btn--primary" type="submit">Subscribe</button>
      </form>
    </div>
  </section>`;

export const trustBar = () => `
  <section class="trust">
    <div class="container trust__inner">
      <div><span class="trust__icon" aria-hidden="true">❦</span>Single-origin, undiluted</div>
      <div><span class="trust__icon" aria-hidden="true">◴</span>Bottled in small batches</div>
      <div><span class="trust__icon" aria-hidden="true">♻︎</span>Recyclable amber glass</div>
      <div><span class="trust__icon" aria-hidden="true">✦</span>Cruelty-free &amp; vegan</div>
    </div>
  </section>`;

export const categoryTiles = () => `
  <div class="moods">
    ${categories.map((c) => `
      <a class="mood" href="${categoryUrl(c)}">
        <span class="mood__dot" style="background:${c.color}" aria-hidden="true">${c.icon}</span>
        <span class="mood__label">${c.label}</span>
        <span class="mood__note">${esc(c.blurb)}</span>
      </a>`).join("")}
  </div>`;

export const oilLibrary = () => `
  <section class="section section--dark" data-reveal>
    <div class="container">
      <div class="section__head section__head--center">
        <p class="eyebrow eyebrow--light">The oil library</p>
        <h2>Five distillations, five stories</h2>
      </div>
      <div class="library" data-library>
        ${library.map((e, i) => {
          const p = products.find((x) => x.id === e.id);
          return `<article class="lib${i === 0 ? " is-open" : ""}" data-lib="${i}">
            <div class="lib__img" style="background-image:url('${e.image}')" role="img" aria-label="${esc(e.name)}"></div>
            <div class="lib__veil"></div>
            <button class="lib__toggle" aria-expanded="${i === 0}"><span class="lib__name">${e.name}</span></button>
            <div class="lib__panel">
              <p class="lib__story">${e.name} is a <em>${e.story}</em> story</p>
              <p class="lib__latin">${esc(p.botanical)} · ${esc(p.origin)}</p>
              <p class="lib__blurb">${esc(e.blurb)}</p>
              <a class="btn btn--light" href="${productUrl(p)}">View oil</a>
            </div>
          </article>`;
        }).join("")}
      </div>
    </div>
  </section>`;

/* -------------------------------------------------------------- the blog */

export const postUrl = (post) => `/blog/${post.slug}/`;

export const postDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

/** Renders a post's block list. Block kinds are documented in posts.mjs. */
export function renderBlocks(body) {
  return body.map(([kind, value]) => {
    switch (kind) {
      case "h2": return `<h2>${esc(value)}</h2>`;
      case "ul": return `<ul>${value.map((i) => `<li>${i}</li>`).join("")}</ul>`;
      case "ol": return `<ol>${value.map((i) => `<li>${i}</li>`).join("")}</ol>`;
      case "note": return `<aside class="post__note"><p>${value}</p></aside>`;
      case "table": {
        const [head, ...rows] = value;
        return `<div class="post__table"><table>
          <thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>`;
      }
      default: return `<p>${value}</p>`;
    }
  }).join("");
}

export const postCard = (post, mins) => `
  <article class="post-card">
    <a href="${postUrl(post)}">
      <p class="post-card__meta">${esc(post.category)} · ${mins} min read</p>
      <h2>${esc(post.title)}</h2>
      <p class="post-card__excerpt">${esc(post.excerpt)}</p>
      <span class="post-card__more">Read it</span>
    </a>
    <time datetime="${post.date}">${postDate(post.date)}</time>
  </article>`;

export const safetyNote = () => `
  <p class="note">Always dilute before topical use and patch-test first. Not for internal use.
  Consult a doctor if pregnant, nursing or under medical care.</p>`;

export { site, nav, categories, products, library, faqs, steps, money, fromPrice, inStock, firstAvailable, categoryOf };
