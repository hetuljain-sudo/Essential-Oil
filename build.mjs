/**
 * Static site generator.
 *
 *   node build.mjs
 *
 * Reads src/data.mjs and writes one HTML file per page into dist/.
 * Pages are written as folders with an index.html so URLs stay clean:
 * dist/oils/lavender-fields/index.html is served at /oils/lavender-fields/.
 */

import { mkdir, writeFile, copyFile, readFile, rm, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  site, categories, products, faqs, steps,
  inCategory, bySlug, fromPrice, inStock, firstAvailable, categoryOf, money,
} from "./src/data.mjs";

import {
  layout, esc, productGrid, productCard, productMedia, mediaClass, bottleSVG, breadcrumbs,
  newsletter, trustBar, categoryTiles, oilLibrary, safetyNote,
  productUrl, categoryUrl, postUrl, postDate, postCard, renderBlocks,
} from "./src/templates.mjs";

import { guides } from "./src/content.mjs";
import { postsNewestFirst, readingTime } from "./src/posts.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

const pages = [];
const page = (path, html) => pages.push({ path, html });

// Counts in page copy come from the data, so they can't drift out of date.
const count = products.length;

/**
 * Questions every oil needs answered, written from its own data rather than
 * repeated by hand 24 times. These are appended after the oil-specific ones.
 */
function sharedFaqs(p) {
  const citrus = p.method === "Cold pressed" && !p.carrier;
  const out = [];

  out.push({
    q: "How long does it keep once opened?",
    a: p.carrier
      ? `Around a year for a cold-pressed oil like this one — less in a warm bathroom. Keep the cap tight and store it somewhere cool and dark. If it starts to smell like old crayons, it has turned and should not go on skin.`
      : citrus
        ? `About a year. Cold-pressed citrus oils oxidise faster than distilled ones, and an oxidised citrus oil is both flatter to smell and more likely to irritate skin.`
        : `Two to three years stored properly — cool, dark and tightly closed. Distilled oils keep considerably better than cold-pressed citrus.`,
  });

  out.push({
    q: p.carrier ? "Do I need to dilute it?" : "What dilution should I use on skin?",
    a: p.carrier
      ? `No — this is the carrier. It goes on neat, or it is what you dilute essential oils into. For a 2% blend, add about 12 drops of essential oil per 30 ml.`
      : p.warning
        ? `Lower than most. ${p.warning} For general use, dilute into a carrier oil such as jojoba and patch-test on a small area first.`
        : `Around 2% for the body — roughly 12 drops per 30 ml of carrier oil — and 1% for the face. Always patch-test before wider use, and never apply neat.`,
  });

  if (!p.carrier) {
    out.push({
      q: "Can I take it internally?",
      a: `No. None of our oils are food grade and none are sold for internal use. Essential oils are extremely concentrated, and advice to add them to water or food is not advice we endorse.`,
    });
  }

  out.push({
    q: "How quickly will it arrive?",
    a: `Orders are dispatched from Mumbai within two business days and usually arrive within a further three to five, depending on where you are. Shipping is free over ${money(site.freeShippingAt)}.`,
  });

  return out;
}

const faqsFor = (p) => [...(guides[p.id]?.faqs || []), ...sharedFaqs(p)];

/* ----------------------------------------------------------------- home */

page("/", layout({
  path: "/",
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  jsonLd: {
    "@context": "https://schema.org", "@type": "Store",
    name: site.name, description: site.description, url: site.url, email: site.email,
  },
  body: `
    <section class="hero">
      <div class="container hero__inner">
        <div class="hero__copy">
          <p class="eyebrow">Small batch · Single origin · Shipped across India</p>
          <h1>Nature, bottled<br /><em>at its purest.</em></h1>
          <p class="lead">${count} oils, bought from growers and distillers we can name, decanted into amber glass and sent straight to you.</p>
          <div class="hero__ctas">
            <a href="/shop/" class="btn btn--primary">Shop all oils</a>
            <a href="/collections/" class="btn btn--ghost">Browse collections</a>
          </div>
          <ul class="hero__stats">
            <li><strong>${products.length}</strong><span>Oils in the range</span></li>
            <li><strong>100%</strong><span>Pure &amp; undiluted</span></li>
            <li><strong>48h</strong><span>Dispatch from Mumbai</span></li>
          </ul>
        </div>
        <div class="hero__art" aria-hidden="true">
          <div class="hero__circle"></div>
          <div class="hero__bottles">
            ${["lavender-fields", "frankincense-quiet", "peppermint-spark"]
              .map((id) => { const p = products.find((x) => x.id === id); return bottleSVG(p.swatch, p.name.split(" ")[0]); })
              .join("")}
          </div>
          <svg class="leaf leaf--1" viewBox="0 0 60 100"><path d="M30 2C55 30 55 70 30 98 5 70 5 30 30 2z" fill="currentColor"/><path d="M30 10v86" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/></svg>
          <svg class="leaf leaf--2" viewBox="0 0 60 100"><path d="M30 2C55 30 55 70 30 98 5 70 5 30 30 2z" fill="currentColor"/><path d="M30 10v86" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/></svg>
        </div>
      </div>
    </section>

    ${trustBar()}

    <section class="section" data-reveal>
      <div class="container">
        <div class="section__head">
          <div><p class="eyebrow">Favourites</p><h2>Start here</h2></div>
          <a class="btn btn--ghost" href="/shop/">See all ${products.length} oils</a>
        </div>
        ${productGrid(products.filter((p) => p.featured).slice(0, 4), "grid--row")}
      </div>
    </section>

    <section class="section section--tint" data-reveal>
      <div class="container">
        <div class="section__head section__head--center">
          <p class="eyebrow">Find your oil</p>
          <h2>Shop by collection</h2>
        </div>
        ${categoryTiles()}
      </div>
    </section>

    ${oilLibrary()}

    <section class="section" data-reveal>
      <div class="container">
        <div class="section__head section__head--center">
          <p class="eyebrow">How we work</p>
          <h2>From grower to your shelf</h2>
        </div>
        <div class="steps steps--light">
          ${steps.map((s) => `<div><span>${s.n}</span><h4>${s.h}</h4><p>${esc(s.p)}</p></div>`).join("")}
        </div>
        <p class="note">We're a young business with a deliberately small range, so we can speak honestly about
        everything we carry. <a href="/faq/#product-quality-sourcing">Read how we source and check our oils</a>.</p>
      </div>
    </section>

    ${newsletter()}`,
}));

/* ----------------------------------------------------------------- shop */

page("/shop/", layout({
  path: "/shop/",
  title: "Shop all essential oils",
  description: "All twelve Sarvha oils — single-origin essential oils and cold-pressed carriers, with sizes, prices and usage notes.",
  jsonLd: {
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem", position: i + 1, url: site.url + productUrl(p), name: p.name,
    })),
  },
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs([{ href: "/", label: "Home" }, { label: "Shop" }])}
        <div class="page-head">
          <p class="eyebrow">The collection</p>
          <h1>Every oil we make</h1>
          <p class="lead">${products.length} bottles across ${categories.length} collections. Each one single-origin, undiluted, and sold in the sizes we actually use ourselves.</p>
        </div>

        <div class="filters" data-filters role="group" aria-label="Filter by collection">
          <button class="chip is-active" data-filter="all" aria-pressed="true">All oils</button>
          ${categories.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${c.label}</button>`).join("")}
        </div>

        <div class="toolbar">
          <div class="search" id="search">
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
            <input type="search" placeholder="Search oils, e.g. lavender or citrus" aria-label="Search products" data-search-input />
          </div>
          <div class="toolbar__right">
            <span class="toolbar__count" data-result-count aria-live="polite"></span>
            <span class="sort">
              <span class="sort__label">Sort</span>
              <select data-sort aria-label="Sort oils">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name A–Z</option>
              </select>
            </span>
          </div>
        </div>

        <div data-grid>${productGrid(products)}</div>
      </div>
    </section>
    ${safetyNote()}
    ${newsletter()}`,
}));

/* ---------------------------------------------------------- collections */

page("/collections/", layout({
  path: "/collections/",
  title: "Collections",
  description: "Four collections — relaxation, energy, immunity and skincare — to help you find the right oil for what you need.",
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs([{ href: "/", label: "Home" }, { label: "Collections" }])}
        <div class="page-head">
          <p class="eyebrow">Browse</p>
          <h1>Four collections</h1>
          <p class="lead">We group the range by what people actually come looking for, rather than by botanical family.</p>
        </div>
        <div class="coll-list">
          ${categories.map((c) => {
            const items = inCategory(c.id);
            return `<article class="coll">
              <div class="coll__head" style="background:${c.color}">
                <span class="coll__icon" aria-hidden="true">${c.icon}</span>
                <h2><a href="${categoryUrl(c)}">${c.label}</a></h2>
                <p>${esc(c.blurb)}</p>
              </div>
              <div class="coll__body">
                <p>${esc(c.intro)}</p>
                <ul class="coll__oils">
                  ${items.map((p) => `<li><a href="${productUrl(p)}">${esc(p.name)}</a> <span class="muted">${money(fromPrice(p))}</span></li>`).join("")}
                </ul>
                <a class="btn btn--ghost" href="${categoryUrl(c)}">Shop ${c.label.toLowerCase()} (${items.length})</a>
              </div>
            </article>`;
          }).join("")}
        </div>
      </div>
    </section>
    ${newsletter()}`,
}));

for (const c of categories) {
  const items = inCategory(c.id);
  page(categoryUrl(c), layout({
    path: categoryUrl(c),
    title: `${c.label} oils`,
    description: `${c.blurb} ${c.intro}`,
    jsonLd: {
      "@context": "https://schema.org", "@type": "ItemList", name: `${c.label} oils`,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem", position: i + 1, url: site.url + productUrl(p), name: p.name,
      })),
    },
    body: `
      <section class="section section--first">
        <div class="container">
          ${breadcrumbs([{ href: "/", label: "Home" }, { href: "/collections/", label: "Collections" }, { label: c.label }])}
          <div class="page-head page-head--coll" style="--tint:${c.color}">
            <span class="coll__icon coll__icon--lg" aria-hidden="true">${c.icon}</span>
            <p class="eyebrow">Collection</p>
            <h1>${c.label}</h1>
            <p class="lead">${esc(c.intro)}</p>
          </div>
          ${productGrid(items)}
          <div class="coll-next">
            <h3>Other collections</h3>
            <div class="coll-next__row">
              ${categories.filter((x) => x.id !== c.id).map((x) =>
                `<a class="coll-next__item" href="${categoryUrl(x)}" style="background:${x.color}">
                   <span aria-hidden="true">${x.icon}</span>${x.label}
                 </a>`).join("")}
            </div>
          </div>
        </div>
      </section>
      ${safetyNote()}
      ${newsletter()}`,
  }));
}

/* ------------------------------------------------------------- products */

for (const p of products) {
  const cat = categoryOf(p.category);
  // One row only — the grid is four across, and a fifth card orphaned on its
  // own row reads as a mistake. "See all" covers the rest of the collection.
  const related = inCategory(p.category).filter((x) => x.id !== p.id).slice(0, 4);
  const v = firstAvailable(p);
  const multi = p.variants.length > 1;
  const g = guides[p.id] || {};
  const faqs = faqsFor(p);

  page(productUrl(p), layout({
    path: productUrl(p),
    title: p.name,
    description: `${p.tagline} ${p.desc}`.slice(0, 180),
    // Product and FAQPage together, so the questions are eligible to show
    // in search results alongside the price.
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          name: p.name, description: p.desc, category: cat.label,
          image: p.image ? [p.image.src] : undefined,
          additionalProperty: [
            { "@type": "PropertyValue", name: "Botanical name", value: p.botanical },
            { "@type": "PropertyValue", name: "Origin", value: p.origin },
            { "@type": "PropertyValue", name: "Extraction", value: p.method },
          ],
          offers: p.variants.map((x) => ({
            "@type": "Offer", name: x.size, price: x.price, priceCurrency: "INR",
            url: site.url + productUrl(p),
            availability: x.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          })),
        },
        {
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question", name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    },
    body: `
      <section class="section section--first">
        <div class="container">
          ${breadcrumbs([
            { href: "/", label: "Home" },
            { href: "/shop/", label: "Shop" },
            { href: categoryUrl(cat), label: cat.label },
            { label: p.name },
          ])}

          <div class="pdp" data-pdp="${p.id}">
            <div class="pdp__media${mediaClass(p)}" style="background:${p.bg}">
              ${productMedia(p, "(max-width: 860px) 100vw, 45vw", true)}
              ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
            </div>

            <div class="pdp__info">
              <p class="eyebrow"><a href="${categoryUrl(cat)}">${cat.label}</a></p>
              <h1>${esc(p.name)}</h1>
              <p class="latin">${esc(p.botanical)}</p>
              <p class="pdp__tagline">${esc(p.tagline)}</p>
              <p class="pdp__desc">${esc(p.desc)}</p>

              <div class="tags">${p.notes.map((n) => `<span class="tag">${esc(n)}</span>`).join("")}</div>

              ${multi ? `
              <fieldset class="sizes">
                <legend>Size</legend>
                ${p.variants.map((x, i) => `
                  <label class="size${i === p.variants.indexOf(v) ? " is-active" : ""}${x.stock <= 0 ? " is-sold" : ""}">
                    <input type="radio" name="size" value="${x.size}" data-price="${x.price}" data-stock="${x.stock}"
                      ${x === v ? "checked" : ""} ${x.stock <= 0 ? "disabled" : ""} data-size-pick />
                    <span class="size__label">${x.size}</span>
                    <span class="size__price">${x.stock > 0 ? money(x.price) : "Sold out"}</span>
                  </label>`).join("")}
              </fieldset>` : `<p class="pdp__single">${v.size} bottle</p>`}

              <div class="pdp__buy">
                <div class="qty qty--lg">
                  <button data-mqty="-1" aria-label="Decrease quantity">−</button>
                  <span data-qty-value aria-live="polite">1</span>
                  <button data-mqty="1" aria-label="Increase quantity">+</button>
                </div>
                <div class="pdp__price"><span class="price" data-live-price>${money(v.price)}</span></div>
              </div>
              <p class="stock-note" data-stock-note${v.stock > 8 ? " hidden" : ""}>${v.stock > 0 ? `Only ${v.stock} left` : ""}</p>

              <button class="btn btn--primary btn--block" data-pdp-add${inStock(p) ? "" : " disabled"}>
                ${inStock(p) ? "Add to cart" : "Sold out"}
              </button>
              <p class="muted small pdp__ship">Free shipping over ${money(site.freeShippingAt)} · Dispatched within 48 hours</p>

              ${p.warning ? `
              <div class="warn" role="note">
                <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
                  <path d="M10 2.5L18.5 17.5H1.5L10 2.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                  <path d="M10 8v4M10 14.5v.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <p><strong>Safety note.</strong> ${esc(p.warning)}</p>
              </div>` : ""}

              <dl class="specs">
                <dt>Origin</dt><dd>${esc(p.origin)}</dd>
                <dt>Extraction</dt><dd>${esc(p.method)}</dd>
                <dt>Contains</dt><dd>${p.ingredients.map(esc).join(", ")}</dd>
              </dl>
            </div>
          </div>

          <div class="pdp__detail">
            <section>
              <h2>How to use</h2>
              <ul class="checks">${p.usage.map((u) => `<li>${esc(u)}</li>`).join("")}</ul>
              <p class="muted small">Dilute before applying to skin and patch-test first. Not for internal use.</p>
            </section>
            <section>
              <h2>Scent profile</h2>
              <ul class="notes-list">${p.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
              <h2>What's in it</h2>
              <ul class="notes-list">${p.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
            </section>
          </div>

          ${g.whoFor ? `
          <section class="pdp__block">
            <h2>Who it's for</h2>
            <div class="whofor">
              ${g.whoFor.map((w) => `
                <article><h3>${esc(w.h)}</h3><p>${esc(w.p)}</p></article>`).join("")}
            </div>
          </section>` : ""}

          ${g.mistakes ? `
          <section class="pdp__block">
            <h2>What people get wrong</h2>
            <div class="prose prose--wide">
              ${g.mistakes.map((m) => `<p>${esc(m)}</p>`).join("")}
            </div>
          </section>` : ""}

          ${g.limits ? `
          <section class="pdp__block pdp__block--limits">
            <h2>What it won't do</h2>
            <div class="prose prose--wide">
              ${g.limits.map((l) => `<p>${esc(l)}</p>`).join("")}
              <p class="muted small">We describe how our oils smell and how people use them. We don't make
              medical claims, because essential oils aren't medicine.</p>
            </div>
          </section>` : ""}

          <section class="pdp__block" id="questions">
            <h2>Questions about ${esc(p.name)}</h2>
            <div class="faq__list faq__list--pdp">
              ${faqs.map((f) => `
                <details>
                  <summary>${esc(f.q)}</summary>
                  <p>${esc(f.a)}</p>
                </details>`).join("")}
            </div>
            <p class="muted small">Something not covered? Write to us at
              <a href="mailto:${site.email}">${site.email}</a>, or see the
              <a href="/faq/">full FAQ</a>.</p>
          </section>

          ${related.length ? `
          <div class="related-block">
            <div class="section__head">
              <div><p class="eyebrow">More from this collection</p><h2>${cat.label}</h2></div>
              <a class="btn btn--ghost" href="${categoryUrl(cat)}">See all</a>
            </div>
            ${productGrid(related, "grid--row")}
          </div>` : ""}
        </div>
      </section>
      ${newsletter()}`,
  }));
}

/* ----------------------------------------------------------------- blog */

const blogPosts = postsNewestFirst();

page("/blog/", layout({
  path: "/blog/",
  title: "Journal",
  description: `Notes on buying, using and storing essential oils, from the ${site.name} team.`,
  jsonLd: blogPosts.length ? {
    "@context": "https://schema.org", "@type": "Blog",
    name: `${site.name} Journal`, url: site.url + "/blog/",
    blogPost: blogPosts.map((post) => ({
      "@type": "BlogPosting", headline: post.title, datePublished: post.date,
      url: site.url + postUrl(post), description: post.excerpt,
    })),
  } : undefined,
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs([{ href: "/", label: "Home" }, { label: "Journal" }])}
        <div class="page-head">
          <p class="eyebrow">Journal</p>
          <h1>Notes from the bench</h1>
          <p class="lead">What we've learned about buying, using and storing essential oils —
          written plainly, with no claims we can't stand behind.</p>
        </div>

        ${blogPosts.length ? `
          <div class="post-list">
            ${blogPosts.map((post) => postCard(post, readingTime(post))).join("")}
          </div>`
        : `
          <div class="no-results">
            <p><strong>Nothing published yet.</strong></p>
            <p class="muted">The first pieces are being written. In the meantime, every oil's
            own page covers how to use it, what people get wrong, and what it won't do.</p>
            <a class="btn btn--ghost" href="/shop/">Browse the oils</a>
          </div>`}
      </div>
    </section>
    ${newsletter()}`,
}));

for (const post of blogPosts) {
  const mins = readingTime(post);
  const more = blogPosts.filter((x) => x.slug !== post.slug).slice(0, 2);
  const oils = (post.related || []).map(bySlug).filter(Boolean).slice(0, 4);

  page(postUrl(post), layout({
    path: postUrl(post),
    title: post.title,
    description: post.excerpt,
    jsonLd: {
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: post.title, description: post.excerpt,
      datePublished: post.date, dateModified: post.date,
      author: { "@type": "Organization", name: site.name },
      publisher: { "@type": "Organization", name: site.name },
      mainEntityOfPage: site.url + postUrl(post),
    },
    body: `
      <section class="section section--first">
        <div class="container">
          ${breadcrumbs([
            { href: "/", label: "Home" },
            { href: "/blog/", label: "Journal" },
            { label: post.title },
          ])}
          <article class="post">
            <header class="post__head">
              <p class="eyebrow">${esc(post.category)}</p>
              <h1>${esc(post.title)}</h1>
              <p class="post__meta">
                <time datetime="${post.date}">${postDate(post.date)}</time> · ${mins} min read
              </p>
              <p class="post__excerpt">${esc(post.excerpt)}</p>
            </header>
            <div class="post__body">${renderBlocks(post.body)}</div>
          </article>

          ${oils.length ? `
          <div class="related-block">
            <div class="section__head">
              <div><p class="eyebrow">Mentioned above</p><h2>Oils from this piece</h2></div>
              <a class="btn btn--ghost" href="/shop/">See all ${count} oils</a>
            </div>
            ${productGrid(oils, "grid--row")}
          </div>` : ""}

          ${more.length ? `
          <div class="related-block">
            <div class="section__head"><div><p class="eyebrow">Keep reading</p><h2>More from the journal</h2></div></div>
            <div class="post-list post-list--row">
              ${more.map((x) => postCard(x, readingTime(x))).join("")}
            </div>
          </div>` : ""}
        </div>
      </section>
      ${newsletter()}`,
  }));
}

/* ---------------------------------------------------------------- about */

page("/about/", layout({
  path: "/about/",
  title: "Our story",
  description: "Why we started Sarvha, how we source our oils, and what we will and won't claim about them.",
  body: `
    <section class="section section--first">
      <div class="container narrow">
        ${breadcrumbs([{ href: "/", label: "Home" }, { label: "Our story" }])}
        <div class="page-head">
          <p class="eyebrow">Our story</p>
          <h1>A small range, honestly described.</h1>
        </div>
        <div class="prose">
          <p class="lead">We started Sarvha because finding a genuinely pure oil shouldn't require detective work.</p>
          <p>The essential oil aisle is full of confident claims and very little detail. Bottles say "therapeutic grade" — a phrase with no legal meaning — and tell you nothing about where the plant grew, how it was extracted, or what else ended up in the bottle.</p>
          <p>So we went the other way. We buy from a small number of growers and distillers we can name, we keep the range deliberately small, and we write down what we actually know about each oil: the botanical species, where it came from, how it was extracted, and what it smells like.</p>
          <h2>What we will and won't claim</h2>
          <p>Our oils are 100% pure and undiluted, with no synthetic fragrance or fillers. We ask our suppliers for the documentation that comes with each batch, and we'll share it if you ask.</p>
          <p>What we won't do is dress that up as something bigger. We're a young business, and we're not going to overstate our testing programme or invent review counts. If you want to know exactly what we hold on a particular oil, <a href="/contact/">ask us</a> and we'll tell you straight.</p>
          <h2>On aromatherapy claims</h2>
          <p>We describe how our oils smell and how people like to use them. We don't make medical claims, because essential oils aren't medicine. If you're pregnant, nursing, on medication, or buying for a child, talk to a doctor first — and <a href="/faq/#usage-safety">read our safety notes</a>.</p>
        </div>
        <div class="steps steps--light">
          ${steps.map((s) => `<div><span>${s.n}</span><h4>${s.h}</h4><p>${esc(s.p)}</p></div>`).join("")}
        </div>
      </div>
    </section>
    ${trustBar()}
    ${newsletter()}`,
}));

/* ------------------------------------------------------------------ faq */

const faqCats = [...new Set(faqs.map((f) => f.cat))];
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

page("/faq/", layout({
  path: "/faq/",
  title: "Frequently asked questions",
  description: "Purity and sourcing, safe use and dilution, shipping across India, and returns.",
  jsonLd: {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs([{ href: "/", label: "Home" }, { label: "FAQ" }])}
        <div class="page-head">
          <p class="eyebrow">Questions</p>
          <h1>Frequently asked</h1>
          <p class="lead">Can't find an answer? Write to us at <a href="mailto:${site.email}">${site.email}</a>.</p>
        </div>
        <div class="faq-layout">
          <nav class="faq-jump" aria-label="FAQ sections">
            <h2>Jump to</h2>
            ${faqCats.map((c) => `<a href="#${slugify(c)}">${c}</a>`).join("")}
          </nav>
          <div class="faq__list">
            ${faqCats.map((c) => `
              <section class="faq__group" id="${slugify(c)}">
                <h2 class="faq__cat">${c}</h2>
                ${faqs.filter((f) => f.cat === c).map((f) => `
                  <details>
                    <summary>${esc(f.q)}</summary>
                    <p>${esc(f.a)}</p>
                  </details>`).join("")}
              </section>`).join("")}
          </div>
        </div>
      </div>
    </section>
    ${newsletter()}`,
}));

/* -------------------------------------------------------------- contact */

page("/contact/", layout({
  path: "/contact/",
  title: "Contact",
  description: `Get in touch with ${site.name} about an order, bulk pricing, or which oil suits what you need.`,
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs([{ href: "/", label: "Home" }, { label: "Contact" }])}
        <div class="contact">
          <div>
            <div class="page-head">
              <p class="eyebrow">Say hello</p>
              <h1>Get in touch</h1>
              <p class="lead">Questions about an oil, a bulk order, or something that arrived wrong — all of it reaches the same small team.</p>
            </div>
            <dl class="contact__details">
              <dt>Email</dt><dd><a href="mailto:${site.email}">${site.email}</a></dd>
              <dt>Phone</dt><dd>${site.phone}</dd>
              <dt>Address</dt><dd>${site.address.join("<br />")}</dd>
              <dt>Hours</dt><dd>Monday to Friday, 10am – 6pm IST</dd>
            </dl>
            <p class="muted small">We read everything and usually reply within a day or two.</p>
          </div>
          <form class="contact__form" data-contact novalidate>
            <h2>Send a message</h2>
            <label>Your name<input type="text" name="name" required /></label>
            <label>Email<input type="email" name="email" required /></label>
            <label>Subject
              <select name="subject">
                <option>A question about an oil</option>
                <option>Bulk or wholesale</option>
                <option>An existing order</option>
                <option>Something else</option>
              </select>
            </label>
            <label>Message<textarea name="message" rows="5" required></textarea></label>
            <button class="btn btn--primary btn--block" type="submit">Send message</button>
            <p class="muted small">This form isn't connected to a backend yet — nothing is sent.</p>
          </form>
        </div>
      </div>
    </section>`,
}));

/* ------------------------------------------------------------- 404 page */

page("/404.html", layout({
  path: "/404.html",
  title: "Page not found",
  description: "That page doesn't exist.",
  body: `
    <section class="section section--first">
      <div class="container narrow center">
        <div class="page-head">
          <p class="eyebrow">404</p>
          <h1>We couldn't find that.</h1>
          <p class="lead">The page may have moved, or the link may be wrong.</p>
        </div>
        <div class="hero__ctas center">
          <a class="btn btn--primary" href="/shop/">Shop all oils</a>
          <a class="btn btn--ghost" href="/">Back home</a>
        </div>
      </div>
    </section>`,
}));

/* --------------------------------------------------------------- output */

// Catalog data the browser needs for the cart drawer and shop filtering.
const catalog = {
  currency: site.currency, locale: site.locale, freeShippingAt: site.freeShippingAt,
  categories: categories.map(({ id, label }) => ({ id, label })),
  products: products.map((p) => ({
    id: p.id, name: p.name, short: p.short || null, botanical: p.botanical, category: p.category,
    tagline: p.tagline, notes: p.notes, featured: !!p.featured, badge: p.badge || null,
    bg: p.bg, swatch: p.swatch, url: productUrl(p),
    image: p.image || null,
    variants: p.variants,
  })),
};

async function emptyDir(dir) {
  try {
    for (const entry of await readdir(dir)) await rm(join(dir, entry), { recursive: true, force: true });
  } catch { /* dist doesn't exist yet */ }
}

await mkdir(dist, { recursive: true });
await emptyDir(dist);

for (const { path, html } of pages) {
  const file = path.endsWith(".html") ? join(dist, path) : join(dist, path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, "utf8");
}

await writeFile(join(dist, "catalog.js"), `window.CATALOG = ${JSON.stringify(catalog)};\n`, "utf8");
// styles.css holds the base system; pages.css adds the multi-page layer.
const css = await Promise.all(
  ["src/assets/styles.css", "src/assets/pages.css"].map((f) => readFile(join(root, f), "utf8"))
);
await writeFile(join(dist, "styles.css"), css.join("\n"), "utf8");
await copyFile(join(root, "src/assets/app.js"), join(dist, "app.js"));

// A sitemap, so the new pages are discoverable.
const urls = pages.filter((p) => !p.path.endsWith("404.html")).map((p) => site.url + p.path);
await writeFile(join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
  `\n</urlset>\n`, "utf8");
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`, "utf8");

console.log(`Built ${pages.length} pages into dist/`);
for (const p of pages) console.log("  " + p.path);
