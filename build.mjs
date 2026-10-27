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
  site, categories, products, library, faqs, steps,
  inCategory, bySlug, fromPrice, inStock, firstAvailable, categoryOf, money,
} from "./src/data.mjs";
import { skuFor } from "./src/sku.mjs";

import {
  layout, esc, productGrid, productCard, productMedia, mediaClass, bottleSVG, breadcrumbs,
  newsletter, trustBar, categoryTiles, oilLibrary, safetyNote,
  productUrl, categoryUrl, postDate, clamp,
  setAssetStamp,
} from "./src/templates.mjs";

import { guides } from "./src/content.mjs";
import { hubs } from "./src/collections.mjs";
import { guidePages, liveGuides } from "./src/guides.mjs";
import { policies } from "./src/policies.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

/* Stamp the shared assets before a single page is rendered.
 *
 * Hashed from the sources that produce styles.css, app.js and catalog.js,
 * so the stamp changes exactly when one of them does — and not on every
 * build, which would throw away a perfectly good cache every deploy. */
{
  const { createHash } = await import("node:crypto");
  const sources = [
    "src/assets/styles.css", "src/assets/pages.css",
    "src/assets/app.js", "src/redirect.mjs", "src/data.mjs",
  ];
  const h = createHash("sha256");
  for (const f of sources) h.update(await readFile(join(root, f)));
  setAssetStamp(h.digest("hex").slice(0, 8));
}

const pages = [];
const page = (path, html) => pages.push({ path, html });

/** The postal address as display lines. */
const addressLines = () => [
  ...site.address.lines,
  `${site.address.city} – ${site.address.postcode}`,
  site.address.country,
];

// Counts in page copy come from the data, so they can't drift out of date.
const count = products.length;

/* ------------------------------------------------------------------- SEO */

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BUILD_DATE = new Date().toISOString().slice(0, 10);
/** Offers need a price validity date; a year out is the usual convention. */
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);

const brand = { "@type": "Brand", name: site.name };

const organization = {
  "@type": "Organization",
  "@id": site.url + "/#organization",
  name: site.name,
  url: site.url,
  email: site.email,
  telephone: site.phones,
  description: site.description,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.lines.join(", "),
    addressLocality: site.address.city,
    postalCode: site.address.postcode,
    addressRegion: "Delhi",
    addressCountry: "IN",
  },
};

/** Lets Google show a search box for the site in results. */
const website = {
  "@type": "WebSite",
  "@id": site.url + "/#website",
  url: site.url,
  name: site.name,
  inLanguage: "en-IN",
  publisher: { "@id": site.url + "/#organization" },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${site.url}/shop/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

/** What the store promises, expressed the way rich results expect. */
const returnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "IN",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 30,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
};

const deliveryTime = {
  "@type": "ShippingDeliveryTime",
  handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
  transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 5, unitCode: "DAY" },
};

/* Two rates, because that is what we actually charge: free at or above the
   threshold, a flat fee below it. This used to declare free shipping
   unconditionally, which was a claim we would not have honoured on a ₹449
   order once checkout went live. */
const shippingDetails = [
  {
    "@type": "OfferShippingDetails",
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    shippingRate: {
      "@type": "MonetaryAmount", value: 0, currency: "INR",
      eligibleTransactionVolume: {
        "@type": "PriceSpecification",
        minPrice: site.freeShippingAt, priceCurrency: "INR",
      },
    },
    deliveryTime,
  },
  {
    "@type": "OfferShippingDetails",
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    shippingRate: { "@type": "MonetaryAmount", value: site.shippingFlat, currency: "INR" },
    deliveryTime,
  },
];


const isCarrier = (p) => !!p.carrier;
const oilWord = (p) => (isCarrier(p) ? "Carrier Oil" : "Essential Oil");

/** A product title people actually search: name, what it is, sizes, brand. */
function productTitle(p) {
  const base = /oil$/i.test(p.name) ? p.name : `${p.name} ${oilWord(p)}`;
  const sizes = p.variants.map((v) => v.size).join(" & ");
  const withSizes = `${base} — ${sizes}`;
  return withSizes.length <= 46 ? withSizes : base;
}

function productDescription(p) {
  const sizes = p.variants.map((v) => v.size).join(" and ");
  return `Buy ${p.name} ${isCarrier(p) ? "carrier oil" : "essential oil"} (${p.botanical}) online in India. ` +
    `${p.tagline} 100% pure and undiluted, in ${sizes}. Free shipping over ${money(site.freeShippingAt)}.`;
}

const HOME = { href: "/", label: "Home" };
const shopTrail        = [HOME, { label: "Shop" }];
const collectionsTrail = [HOME, { label: "Collections" }];
const aboutTrail       = [HOME, { label: "Our story" }];
const faqTrail         = [HOME, { label: "FAQ" }];
const contactTrail     = [HOME, { label: "Contact" }];

/** Site-wide social image — our own photography, standing in for the brand
 *  until a dedicated 1200x630 card exists. */
const defaultOg = (() => {
  const p = products.find((x) => x.image);
  return p ? { src: p.image.src, alt: `${site.name} essential oils` } : null;
})();

/** Product photography doubles as the social image where it exists. */
const ogFor = (p) => (p.image ? { src: p.image.src, alt: p.image.alt } : null);

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
    a: `Orders are dispatched from Delhi within two business days and usually arrive within a further three to five, depending on where you are. Shipping is free over ${money(site.freeShippingAt)}.`,
  });

  return out;
}

const faqsFor = (p) => [...(guides[p.id]?.faqs || []), ...sharedFaqs(p)];

/* ----------------------------------------------------------------- home */

page("/", layout({
  path: "/",
  title: `${site.name} — Pure Essential Oils Online in India`,
  ogImage: defaultOg,
  description: `Buy 100% pure essential oils and cold-pressed carrier oils online in India. ${count} single-origin oils, bottled in small batches and shipped from Delhi. Free shipping over ${money(site.freeShippingAt)}.`,
  jsonLd: [
    organization,
    website,
    {
      "@type": "Store",
      "@id": site.url + "/#store",
      name: site.name,
      description: site.description,
      url: site.url,
      image: products.find((p) => p.image)?.image.src,
      parentOrganization: { "@id": site.url + "/#organization" },
      email: site.email,
      telephone: site.phones,
      priceRange: "₹₹",
      currenciesAccepted: "INR",
      areaServed: { "@type": "Country", name: "India" },
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.lines.join(", "),
        addressLocality: site.address.city,
        postalCode: site.address.postcode,
        addressRegion: "Delhi",
        addressCountry: "IN",
      },
    },
  ],
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
            <li><strong>48h</strong><span>Dispatch from Delhi</span></li>
          </ul>
        </div>
        <div class="hero__art" aria-hidden="true">
          <div class="hero__circle"></div>
          <div class="hero__bottles">
            ${["lavender-fields", "frankincense-quiet", "peppermint-spark"]
              .map((id) => { const p = products.find((x) => x.id === id); return bottleSVG(p.swatch, p.name.split(" ")[0], p.id); })
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
      </div>
    </section>

    ${newsletter()}`,
}));

/* ----------------------------------------------------------------- shop */

page("/shop/", layout({
  path: "/shop/",
  title: "Buy Essential Oils Online in India",
  description: `Shop all ${count} Sarvha oils — single-origin essential oils and cold-pressed carrier oils, 100% pure and undiluted. Sizes, prices and usage notes for every bottle.`,
  breadcrumb: shopTrail,
  ogImage: defaultOg,
  jsonLd: [
    {
      "@type": "CollectionPage",
      name: "Shop all essential oils",
      description: `All ${count} essential and carrier oils sold by ${site.name}.`,
      url: site.url + "/shop/",
      isPartOf: { "@id": site.url + "/#website" },
      about: { "@id": site.url + "/#organization" },
    },
    {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem", position: i + 1, url: site.url + productUrl(p), name: p.name,
      })),
    },
  ],
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs(shopTrail)}
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
  title: "Essential Oil Collections",
  description: `Browse ${site.name} oils by what you need — relaxation, energy, immunity and skincare. ${count} single-origin essential and carrier oils, grouped to help you find the right bottle.`,
  breadcrumb: collectionsTrail,
  ogImage: defaultOg,
  jsonLd: {
    "@type": "CollectionPage",
    name: "Collections",
    url: site.url + "/collections/",
    isPartOf: { "@id": site.url + "/#website" },
    hasPart: categories.map((c) => ({
      "@type": "CollectionPage", name: `${c.label} oils`, url: site.url + categoryUrl(c),
    })),
  },
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs(collectionsTrail)}
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
  const hub = hubs[c.id] || {};
  const startHere = hub.startHere ? bySlug(hub.startHere.id) : null;
  // Sub-group the collection by scent family, biggest group first.
  const families = Object.entries(
    items.reduce((acc, p) => { (acc[p.family] ||= []).push(p); return acc; }, {})
  ).sort((a, b) => b[1].length - a[1].length);
  const sizeRange = [...new Set(items.flatMap((p) => p.variants.map((v) => v.size)))]
    .sort((a, b) => parseFloat(a) - parseFloat(b));
  const sizeLabel = sizeRange.length > 1
    ? sizeRange[0] + " to " + sizeRange[sizeRange.length - 1]
    : (sizeRange[0] || "");
  const catTrail = [HOME, { href: "/collections/", label: "Collections" }, { label: c.label }];
  page(categoryUrl(c), layout({
    path: categoryUrl(c),
    title: `${c.label} Essential Oils — Buy Online`,
    description: `${c.blurb} ${items.length} oils for ${c.label.toLowerCase()} from ${site.name}, 100% pure and shipped across India. ${c.intro}`,
    breadcrumb: catTrail,
    ogImage: items.find((x) => x.image) ? { src: items.find((x) => x.image).image.src, alt: `${c.label} essential oils` } : defaultOg,
    jsonLd: [
      {
        "@type": "CollectionPage",
        name: `${c.label} essential oils`,
        description: c.intro,
        url: site.url + categoryUrl(c),
        isPartOf: { "@id": site.url + "/#website" },
      },
      {
        "@type": "ItemList", name: `${c.label} oils`, numberOfItems: items.length,
        itemListElement: items.map((p, i) => ({
          "@type": "ListItem", position: i + 1, url: site.url + productUrl(p), name: p.name,
        })),
      },
      ...(hub.faqs ? [{
        "@type": "FAQPage",
        mainEntity: hub.faqs.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }] : []),
    ],
    body: `
      <section class="section section--first">
        <div class="container">
          ${breadcrumbs(catTrail)}
          <div class="page-head page-head--coll" style="--tint:${c.color}">
            <span class="coll__icon coll__icon--lg" aria-hidden="true">${c.icon}</span>
            <p class="eyebrow">Collection</p>
            <h1>${c.label} essential oils</h1>
            <p class="lead">${esc(hub.lede || c.intro)}</p>
            <dl class="coll-facts">
              <div><dt>Oils</dt><dd>${items.length}</dd></div>
              <div><dt>From</dt><dd>${money(Math.min(...items.map(fromPrice)))}</dd></div>
              <div><dt>Sizes</dt><dd>${sizeLabel}</dd></div>
              <div><dt>Dispatch</dt><dd>48 hrs</dd></div>
            </dl>
          </div>

          ${startHere ? `
          <section class="start-here">
            <div class="start-here__media${startHere.image ? "" : " has-art"}" style="background:${startHere.bg}">
              ${productMedia(startHere, "(max-width: 860px) 100vw, 32vw")}
            </div>
            <div class="start-here__copy">
              <p class="eyebrow">Start here</p>
              <h2><a href="${productUrl(startHere)}">${esc(startHere.name)}</a></h2>
              <p class="latin">${esc(startHere.botanical)}</p>
              <p>${esc(hub.startHere.why)}</p>
              <p class="start-here__buy">
                <span class="price">${money(fromPrice(startHere))}</span>
                <a class="btn btn--primary" href="${productUrl(startHere)}">View this oil</a>
              </p>
            </div>
          </section>` : ""}

          ${families.map(([fam, list]) => `
            <section class="coll-family" id="${slugify(fam)}">
              <div class="section__head">
                <div><p class="eyebrow">${c.label}</p><h2>${esc(fam)}</h2></div>
                <p class="muted">${list.length} oil${list.length === 1 ? "" : "s"}</p>
              </div>
              ${productGrid(list)}
            </section>`).join("")}

          ${hub.choosing ? `
          <section class="pdp__block">
            <h2>How to choose between them</h2>
            <div class="whofor">
              ${hub.choosing.map((w) => `<article><h3>${esc(w.h)}</h3><p>${esc(w.p)}</p></article>`).join("")}
            </div>
          </section>` : ""}

          <section class="pdp__block">
            <h2>Compare every ${c.label.toLowerCase()} oil</h2>
            <div class="post__table compare">
              <table>
                <thead><tr>
                  <th>Oil</th><th>Botanical name</th><th>Character</th>
                  <th>Sizes</th><th>From</th><th>Note</th>
                </tr></thead>
                <tbody>
                  ${items.map((p) => `<tr>
                    <td><a href="${productUrl(p)}">${esc(p.name)}</a></td>
                    <td><em>${esc(p.botanical)}</em></td>
                    <td>${esc(p.notes.join(", "))}</td>
                    <td>${p.variants.map((v) => v.size).join(", ")}</td>
                    <td>${money(fromPrice(p))}</td>
                    <td>${p.warning ? `<span class="compare__flag">Safety note</span>` : "&mdash;"}</td>
                  </tr>`).join("")}
                </tbody>
              </table>
            </div>
          </section>

          ${hub.uses ? `
          <section class="pdp__block">
            <h2>How people use these</h2>
            <div class="uses">
              ${hub.uses.map((u, i) => `
                <article class="use">
                  <div class="use__icon" aria-hidden="true">${["\u25CC", "\u270B", "\u2668"][i] || "\u25CC"}</div>
                  <h3>${esc(u.h)}</h3><p>${esc(u.p)}</p>
                </article>`).join("")}
            </div>
          </section>` : ""}

          ${hub.faqs ? `
          <section class="pdp__block" id="questions">
            <h2>Questions about ${c.label.toLowerCase()} oils</h2>
            <div class="faq__list faq__list--pdp">
              ${hub.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
            </div>
            <p class="muted small">More in the <a href="/faq/">full FAQ</a>.</p>
          </section>` : ""}

          <div class="coll-next">
            <h2>Other collections</h2>
            <div class="coll-next__row">
              ${categories.filter((x) => x.id !== c.id).map((x) =>
                `<a class="coll-next__item" href="${categoryUrl(x)}" style="background:${x.color}">
                   <span aria-hidden="true">${x.icon}</span>${x.label}
                   <small>${inCategory(x.id).length}</small>
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

  const trail = [
    HOME,
    { href: "/shop/", label: "Shop" },
    { href: categoryUrl(cat), label: cat.label },
    { label: p.name },
  ];

  page(productUrl(p), layout({
    path: productUrl(p),
    title: productTitle(p),
    description: productDescription(p),
    ogType: "product",
    ogImage: ogFor(p),
    breadcrumb: trail,
    // Product and FAQPage together, so the questions are eligible to show
    // in search results alongside the price.
    jsonLd: [
      {
        "@type": "Product",
        "@id": site.url + productUrl(p) + "#product",
        name: `${p.name} ${isCarrier(p) ? "Carrier Oil" : "Essential Oil"}`,
        alternateName: p.name,
        description: p.desc,
        category: `${cat.label} ${isCarrier(p) ? "carrier" : "essential"} oils`,
        sku: skuFor(p, p.variants[0]),
        brand,
        manufacturer: { "@id": site.url + "/#organization" },
        countryOfOrigin: { "@type": "Country", name: p.origin.split(", ").pop() },
        image: p.image ? [p.image.src] : undefined,
        additionalProperty: [
          { "@type": "PropertyValue", name: "Botanical name", value: p.botanical },
          { "@type": "PropertyValue", name: "Origin", value: p.origin },
          { "@type": "PropertyValue", name: "Extraction method", value: p.method },
          { "@type": "PropertyValue", name: "Aroma", value: p.notes.join(", ") },
          { "@type": "PropertyValue", name: "Purity", value: "100% pure and undiluted" },
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...p.variants.map((x) => x.price)),
          highPrice: Math.max(...p.variants.map((x) => x.price)),
          offerCount: p.variants.length,
          availability: inStock(p)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          offers: p.variants.map((x) => ({
            "@type": "Offer",
            name: `${p.name} — ${x.size}`,
            sku: skuFor(p, x),
            price: x.price,
            priceCurrency: "INR",
            priceValidUntil: PRICE_VALID_UNTIL,
            url: site.url + productUrl(p),
            itemCondition: "https://schema.org/NewCondition",
            availability: x.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            seller: { "@id": site.url + "/#organization" },
            hasMerchantReturnPolicy: returnPolicy,
            shippingDetails,
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
    body: `
      <section class="section section--first">
        <div class="container">
${breadcrumbs(trail)}

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

/* --------------------------------------------------------------- guides */

const guideUrl = (g) => `/guides/${g.slug}/`;

/** `draft: true` keeps a guide out of the build and off the index. */
// liveGuides comes from src/guides.mjs so the nav, the footer and this
// file cannot disagree about what is published.

/** Oils carrying a given safety flag, alphabetically. */
const flagged = (key) =>
  products.filter((p) => p.safety && p.safety[key])
    .sort((a, b) => a.name.localeCompare(b.name));

const oilLink = (p) => `<a href="${productUrl(p)}">${esc(p.name)}</a>`;

/**
 * The tables on guide pages are generated from each product's `safety` data,
 * so a guide cannot fall out of step with the catalogue.
 */
function derivedTable(kind) {
  const wrap = (head, rows) => rows.length
    ? `<div class="post__table"><table>
        <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table></div>`
    : `<p class="muted">Nothing in the range currently carries this flag.</p>`;

  if (kind === "dilution") {
    const rows = [
      ["0.5%", "half a drop", "3 drops", "Clove, cinnamon, thyme — anything flagged as a sensitiser"],
      ["1%", "1 drop", "6 drops", "The face, sensitive skin, and most blends for older children"],
      ["2%", "2 drops", "12 drops", "General body use — the everyday default"],
      ["3%", "3 drops", "18 drops", "Short-term, on a small area"],
    ].map((r) => `<tr>${r.map((c, i) =>
      i === 0 ? `<td><strong>${c}</strong></td>` : `<td>${c}</td>`).join("")}</tr>`);
    return wrap(["Dilution", "Per teaspoon (5 ml)", "Per 30 ml", "Typical use"], rows);
  }

  if (kind === "phototoxic") {
    const rows = flagged("phototoxic")
      .sort((a, b) => a.safety.phototoxic - b.safety.phototoxic)
      .map((p) => `<tr>
        <td>${oilLink(p)}</td>
        <td><em>${esc(p.botanical)}</em></td>
        <td>${esc(p.method)}</td>
        <td><strong>${p.safety.phototoxic}%</strong></td>
      </tr>`);
    return wrap(["Oil", "Botanical name", "Extraction", "Limit on sun-exposed skin"], rows);
  }

  if (kind === "maxDilution") {
    const rows = flagged("maxDilution")
      .sort((a, b) => a.safety.maxDilution - b.safety.maxDilution)
      .map((p) => `<tr>
        <td>${oilLink(p)}</td>
        <td><strong>${p.safety.maxDilution}%</strong></td>
        <td>${esc(p.warning || "")}</td>
      </tr>`);
    return wrap(["Oil", "Maximum on skin", "Why"], rows);
  }

  if (kind === "diffuserCaution") {
    const rows = products
      .filter((p) => p.safety && (p.safety.children || p.safety.pets))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `<tr>
        <td>${oilLink(p)}</td>
        <td>${p.safety.children ? "Babies &amp; young children" : "&mdash;"}</td>
        <td>${p.safety.pets ? "Cats &amp; dogs" : "&mdash;"}</td>
      </tr>`);
    return wrap(["Oil", "Avoid around", "Also avoid around"], rows);
  }

  // pregnancy | children | pets | nutAllergy
  const rows = flagged(kind).map((p) => `<tr>
    <td>${oilLink(p)}</td>
    <td><em>${esc(p.botanical)}</em></td>
    <td>${esc(categoryOf(p.category).label)}</td>
    ${kind === "pregnancy" && p.safety.conditions
      ? `<td>Also avoid with ${esc(p.safety.conditions.join(", "))}</td>`
      : kind === "pregnancy" ? "<td>&mdash;</td>" : ""}
  </tr>`);
  const head = ["Oil", "Botanical name", "Collection"];
  if (kind === "pregnancy") head.push("Other cautions");
  return wrap(head, rows);
}

/** Guide bodies use the same block list as posts, plus `table:<kind>`. */
const renderGuide = (body) => body.map(([kind, value]) => {
  if (kind.startsWith("table:")) return derivedTable(kind.slice(6));
  if (kind === "h2") return `<h2 id="${slugify(value)}">${esc(value)}</h2>`;
  if (kind === "ul") return `<ul>${value.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  if (kind === "ol") return `<ol>${value.map((i) => `<li>${i}</li>`).join("")}</ol>`;
  if (kind === "note") return `<aside class="post__note"><p>${value}</p></aside>`;
  return `<p>${value}</p>`;
}).join("");

const guidesTrail = [HOME, { label: "Guides" }];

page("/guides/", layout({
  path: "/guides/",
  title: "Essential Oil Guides",
  description: liveGuides.length
    ? `Plain reference guides from ${site.name} — dilution, phototoxicity, pregnancy and pet safety, and how to use a diffuser. Written from our own catalogue data.`
    : `Reference guides from ${site.name} on using essential oils safely. We're writing them now — in the meantime the FAQ covers dilution, safe use and storage.`,
  breadcrumb: guidesTrail,
  ogImage: defaultOg,
  jsonLd: {
    "@type": "CollectionPage",
    name: "Essential oil guides",
    url: site.url + "/guides/",
    isPartOf: { "@id": site.url + "/#website" },
    // Omitted rather than sent empty: an empty hasPart claims a collection
    // of nothing, which is worse than not making the claim.
    ...(liveGuides.length ? {
      hasPart: liveGuides.map((g) => ({
        "@type": "Article", headline: g.title, url: site.url + guideUrl(g),
      })),
    } : {}),
  },
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs(guidesTrail)}
        <div class="page-head">
          <p class="eyebrow">Guides</p>
          <h1>Reference, not marketing</h1>
          <p class="lead">${liveGuides.length
            ? `Pages answering the questions people actually ask before buying. The tables on
               them are generated from our own catalogue, so they cannot fall out of step with
               what we sell.`
            : `Straight answers to the questions people ask before buying — dilution, safe use,
               storage. We're writing them now, and would rather publish nothing than publish
               something half-checked about safety.`}</p>
        </div>
        ${liveGuides.length ? `
        <div class="post-list">
          ${liveGuides.map((g) => `
            <article class="post-card">
              <a href="${guideUrl(g)}">
                <p class="post-card__meta">Guide</p>
                <h2>${esc(g.title)}</h2>
                <p class="post-card__excerpt">${esc(g.excerpt)}</p>
                <span class="post-card__more">Read it</span>
              </a>
            </article>`).join("")}
        </div>` : `
        <!-- Nothing published yet. Rather than an empty page, point at the
             pages that do answer these questions today. -->
        <div class="guides-empty">
          <h2>In the meantime</h2>
          <ul>
            <li><a href="/faq/#usage-safety">Safe use and dilution</a> — how much to use, and in what.</li>
            <li><a href="/faq/#product-quality-sourcing">Purity and sourcing</a> — what we know about what we sell, and what we don't.</li>
            <li><a href="/faq/">The full FAQ</a>.</li>
          </ul>
          <p class="muted small">Every oil's own page carries its specific safety note —
          phototoxicity, dilution limits, and who should avoid it.</p>
        </div>`}
      </div>
    </section>
    ${newsletter()}`,
}));

for (const g of liveGuides) {
  const trail = [HOME, { href: "/guides/", label: "Guides" }, { label: g.nav }];
  const others = liveGuides.filter((x) => x.slug !== g.slug);
  page(guideUrl(g), layout({
    path: guideUrl(g),
    title: g.title,
    description: g.description,
    breadcrumb: trail,
    ogImage: defaultOg,
    jsonLd: {
      "@type": "Article",
      headline: g.title,
      description: g.description,
      datePublished: g.updated,
      dateModified: g.updated,
      author: { "@id": site.url + "/#organization" },
      publisher: { "@id": site.url + "/#organization" },
      mainEntityOfPage: site.url + guideUrl(g),
    },
    body: `
      <section class="section section--first">
        <div class="container">
          ${breadcrumbs(trail)}
          <article class="post guide">
            <header class="post__head">
              <p class="eyebrow">Guide</p>
              <h1>${esc(g.title)}</h1>
              <p class="post__meta">Last updated ${postDate(g.updated)}</p>
              <p class="post__excerpt">${esc(g.excerpt)}</p>
            </header>
            <div class="post__body">${renderGuide(g.body)}</div>
          </article>

          <div class="related-block">
            <div class="section__head"><div><p class="eyebrow">More guides</p><h2>Keep reading</h2></div></div>
            <div class="post-list post-list--row">
              ${others.map((x) => `
                <article class="post-card">
                  <a href="${guideUrl(x)}">
                    <p class="post-card__meta">Guide</p>
                    <h3>${esc(x.title)}</h3>
                    <p class="post-card__excerpt">${esc(x.excerpt)}</p>
                    <span class="post-card__more">Read it</span>
                  </a>
                </article>`).join("")}
            </div>
          </div>
        </div>
      </section>
      ${newsletter()}`,
  }));
}

/* ---------------------------------------------------------------- about */

page("/about/", layout({
  path: "/about/",
  title: "Our Story — How We Source Our Oils",
  description: `Why we started ${site.name}, how we source our essential oils from a small number of named growers and distillers, and what we will and won't claim about them.`,
  breadcrumb: aboutTrail,
  ogImage: defaultOg,
  jsonLd: {
    "@type": "AboutPage",
    name: `About ${site.name}`,
    url: site.url + "/about/",
    isPartOf: { "@id": site.url + "/#website" },
    about: { "@id": site.url + "/#organization" },
  },
  body: `
    <section class="section section--first">
      <div class="container narrow">
        ${breadcrumbs(aboutTrail)}
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

page("/faq/", layout({
  path: "/faq/",
  title: "Essential Oil FAQs — Purity, Safety & Shipping",
  description: `Answers on purity and sourcing, safe dilution and patch testing, shipping across India and returns. ${faqs.length} questions about buying and using essential oils.`,
  breadcrumb: faqTrail,
  ogImage: defaultOg,
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
        ${breadcrumbs(faqTrail)}
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
  title: "Contact Us — Orders, Bulk Pricing & Advice",
  description: `Get in touch with ${site.name} about an order, bulk or wholesale pricing, or which essential oil suits what you need. Based in New Delhi, shipping across India.`,
  breadcrumb: contactTrail,
  ogImage: defaultOg,
  jsonLd: {
    "@type": "ContactPage",
    name: `Contact ${site.name}`,
    url: site.url + "/contact/",
    isPartOf: { "@id": site.url + "/#website" },
    about: { "@id": site.url + "/#organization" },
  },
  body: `
    <section class="section section--first">
      <div class="container">
        ${breadcrumbs(contactTrail)}
        <div class="contact">
          <div>
            <div class="page-head">
              <p class="eyebrow">Say hello</p>
              <h1>Get in touch</h1>
              <p class="lead">Questions about an oil, a bulk order, or something that arrived wrong — all of it reaches the same small team.</p>
            </div>
            <dl class="contact__details">
              <dt>Email</dt><dd><a href="mailto:${site.email}">${site.email}</a></dd>
              <dt>Phone</dt>
              <dd>${site.phones.map((n) =>
                `<a href="tel:${n.replace(/\s/g, "")}">${n}</a>`).join("<br />")}</dd>
              <dt>Address</dt><dd>${addressLines().join("<br />")}</dd>
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
            <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
            <button class="btn btn--primary btn--block" type="submit">Send message</button>
            <p class="muted small">We read everything and reply by email, usually within a day or two.</p>
          </form>
        </div>
      </div>
    </section>`,
}));

/* ------------------------------------------------------------- accounts */

/* Accounts are optional throughout. Checkout never requires one, and these
   pages are noindex: a login form in search results is noise, and an account
   page in an index would be a mistake waiting to happen. */

const authTrail = (label) => [HOME, { label }];

/** The shared chrome for the three narrow account pages. */
const accountPage = ({ path, title, description, label, body }) =>
  page(path, layout({
    path, title, description,
    noindex: true,
    breadcrumb: authTrail(label),
    body: `
    <section class="section section--first">
      <div class="container container--narrow">
        ${breadcrumbs(authTrail(label))}
        ${body}
      </div>
    </section>`,
  }));

accountPage({
  path: "/account/register/",
  title: "Create an Account",
  description: "Create a Sarvha account to keep your delivery details and see past orders. You can also check out without one.",
  label: "Create account",
  body: `
    <div class="page-head">
      <p class="eyebrow">Accounts</p>
      <h1>Create an account</h1>
      <p class="lead">Keeps your delivery details for next time and shows you what you've ordered before. You don't need one to buy — checkout works perfectly well without.</p>
    </div>

    <form class="auth-form" data-auth-form="register" novalidate>
      <div class="auth-form__error" data-auth-error hidden role="alert"></div>

      <label>Your name
        <input type="text" name="name" autocomplete="name" required />
      </label>
      <label>Email
        <input type="email" name="email" autocomplete="email" required />
      </label>
      <label>Mobile <span class="muted">(optional)</span>
        <input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" />
      </label>
      <label>Password
        <input type="password" name="password" autocomplete="new-password" required minlength="10" />
      </label>
      <p class="muted small">At least 10 characters. Length does more for you than punctuation does.</p>

      <button class="btn btn--primary btn--block" type="submit">Create account</button>
      <p class="muted small">Already have one? <a href="/account/login/">Log in</a>.</p>
    </form>`,
});

accountPage({
  path: "/account/login/",
  title: "Log In",
  description: "Log in to your Sarvha account to see past orders and saved delivery details.",
  label: "Log in",
  body: `
    <div class="page-head">
      <p class="eyebrow">Accounts</p>
      <h1>Log in</h1>
    </div>

    <form class="auth-form" data-auth-form="login" novalidate>
      <div class="auth-form__error" data-auth-error hidden role="alert"></div>

      <label>Email
        <input type="email" name="email" autocomplete="email" required />
      </label>
      <label>Password
        <input type="password" name="password" autocomplete="current-password" required />
      </label>

      <button class="btn btn--primary btn--block" type="submit">Log in</button>
      <p class="muted small">No account yet? <a href="/account/register/">Create one</a>.</p>
    </form>`,
});

accountPage({
  path: "/account/",
  title: "Your Account",
  description: "Your Sarvha account: past orders and saved details.",
  label: "Your account",
  body: `
    <div class="page-head">
      <p class="eyebrow">Accounts</p>
      <h1>Your account</h1>
    </div>

    <!-- Filled by /api/auth/me. Rendered server-side it would be a page that
         must never be cached, for one small panel of content. -->
    <div data-account-panel>
      <p class="muted">Loading your account…</p>
    </div>`,
});

/* ------------------------------------------------------------- checkout */

/* Ordering requires an account. This page gates itself on load, but that is
   only courtesy — api/checkout.js refuses a request without a session, which
   is where the rule actually lives. */

accountPage({
  path: "/checkout/",
  title: "Checkout",
  description: "Complete your Sarvha order.",
  label: "Checkout",
  body: `
    <div class="page-head">
      <p class="eyebrow">Checkout</p>
      <h1>Complete your order</h1>
    </div>

    <div data-checkout-gate>
      <p class="muted">Checking your account…</p>
    </div>

    <div data-checkout-body hidden>
      <div class="checkout__summary" data-checkout-summary></div>

      <form class="auth-form" data-checkout-form novalidate>
        <div class="auth-form__error" data-checkout-error hidden role="alert"></div>

        <h2>Where should it go?</h2>
        <label>Full name
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>Mobile
          <input type="tel" name="phone" autocomplete="tel-national" inputmode="numeric" required />
        </label>
        <label>Address
          <input type="text" name="line1" autocomplete="address-line1" placeholder="House and street" required />
        </label>
        <label>Area <span class="muted">(optional)</span>
          <input type="text" name="line2" autocomplete="address-line2" />
        </label>
        <label>City
          <input type="text" name="city" autocomplete="address-level2" required />
        </label>
        <label>State
          <input type="text" name="state" autocomplete="address-level1" required />
        </label>
        <label>PIN code
          <input type="text" name="postcode" autocomplete="postal-code" inputmode="numeric" required />
        </label>
        <label>Anything we should know? <span class="muted">(optional)</span>
          <input type="text" name="notes" />
        </label>

        <button class="btn btn--primary btn--block" type="submit" data-pay>Pay securely</button>
        <p class="muted small">Payment is handled by Razorpay. We never see your card details.</p>
        <!-- The Rules expect the terms to be reachable at the point of
             purchase. Stated quietly: this is a legal requirement, not
             something to push anyone through. -->
        <p class="muted small checkout__terms">By paying you agree to our
          <a href="/terms/">Terms &amp; Conditions</a> and
          <a href="/refunds/">Refund &amp; Cancellation Policy</a>.</p>
      </form>
    </div>`,
});

accountPage({
  path: "/checkout/thanks/",
  title: "Order Received",
  description: "Thank you — your Sarvha order has been received.",
  label: "Order received",
  body: `
    <div class="page-head">
      <p class="eyebrow">Thank you</p>
      <h1>Your order is in</h1>
      <p class="lead">We've got it. You'll find it in <a href="/account/">your account</a>, and it leaves Delhi within two business days.</p>
    </div>
    <p data-order-ref class="muted"></p>
    <p><a class="btn btn--ghost" href="/shop/">Keep shopping</a></p>`,
});

/* ---------------------------------------------------------------- admin */

/* Everything here is drawn client-side from /api/admin/*, each of which
   checks the admin flag itself. This page being hidden is not the control;
   those endpoints are. It is noindex and absent from the sitemap. */

page("/admin/", layout({
  path: "/admin/",
  title: "Admin",
  description: "Sarvha admin.",
  noindex: true,
  bodyClass: "admin-page",
  body: `
    <section class="section section--first">
      <div class="container">
        <div data-admin-gate><p class="muted">Checking…</p></div>

        <div data-admin hidden>
          <div class="page-head">
            <p class="eyebrow">Admin</p>
            <h1>Shop</h1>
          </div>

          <div class="admin__stats" data-admin-stats></div>

          <div class="admin__tabs" role="tablist">
            <button class="admin__tab is-on" role="tab" data-tab="orders">Orders</button>
            <button class="admin__tab" role="tab" data-tab="messages">Messages</button>
            <button class="admin__tab" role="tab" data-tab="stock">Stock</button>
          </div>

          <div data-panel="orders"></div>
          <div data-panel="messages" hidden></div>
          <div data-panel="stock" hidden></div>
        </div>
      </div>
    </section>`,
}));

/* -------------------------------------------------------------- policies */

/* The four pages the Consumer Protection (E-Commerce) Rules 2020 require,
   and that Razorpay asks for before activating a live account. Content is in
   src/policies.mjs; this only renders it.

   Indexable on purpose — customers and Razorpay are both meant to find them. */

const renderPolicy = (body) => body.map(([kind, value]) => {
  if (kind === "h3") return `<h3>${esc(value)}</h3>`;
  if (kind === "ul") return `<ul>${value.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  if (kind === "note") return `<aside class="post__note"><p>${value}</p></aside>`;
  // Deliberately loud, and deliberately rendered rather than hidden in a
  // comment: an unanswered policy question should be impossible to miss on
  // the page itself, not something only a developer finds.
  if (kind === "todo") {
    return `<aside class="policy-todo"><p><strong>TODO — not yet decided.</strong> ${value}</p></aside>`;
  }
  return `<p>${value}</p>`;
}).join("");

for (const pol of policies) {
  const url = `/${pol.slug}/`;
  const trail = [HOME, { label: pol.nav }];
  const others = policies.filter((x) => x.slug !== pol.slug);

  page(url, layout({
    path: url,
    title: pol.title,
    description: pol.description,
    breadcrumb: trail,
    ogImage: defaultOg,
    jsonLd: {
      "@type": "WebPage",
      name: pol.title,
      description: pol.description,
      url: site.url + url,
      isPartOf: { "@id": site.url + "/#website" },
      publisher: { "@id": site.url + "/#organization" },
      dateModified: pol.updated,
    },
    body: `
      <section class="section section--first">
        <div class="container container--readable">
          ${breadcrumbs(trail)}
          <article class="post policy">
            <header class="post__head">
              <p class="eyebrow">Legal</p>
              <h1>${esc(pol.title)}</h1>
              <p class="post__meta">Last updated ${postDate(pol.updated)}</p>
              <p class="post__excerpt">${esc(pol.lede)}</p>
            </header>
            <div class="post__body">
              ${pol.sections.map((s) => `
                <h2 id="${slugify(s.h)}">${esc(s.h)}</h2>
                ${renderPolicy(s.body)}`).join("")}
            </div>
          </article>

          <nav class="policy-nav" aria-label="Other policies">
            <h2>The other policies</h2>
            <ul>${others.map((x) =>
              `<li><a href="/${x.slug}/">${esc(x.title)}</a></li>`).join("")}</ul>
          </nav>
        </div>
      </section>`,
  }));
}

/* ------------------------------------------------------------- 404 page */

page("/404.html", layout({
  path: "/404.html",
  noindex: true,
  title: "Page Not Found",
  description: `That page doesn't exist. Browse all ${count} pure essential and carrier oils, or head back to the ${site.name} home page.`,
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
  currency: site.currency, locale: site.locale,
  freeShippingAt: site.freeShippingAt, shippingFlat: site.shippingFlat,
  categories: categories.map(({ id, label }) => ({ id, label })),
  // The library rotates daily, so the browser needs all twelve entries.
  library: library.map((e) => {
    const p = bySlug(e.id);
    return {
      ...e,
      botanical: p.botanical,
      origin: p.origin,
      image: p.image.src,
      url: productUrl(p),
    };
  }),
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
// app.js is a plain script, not a module, so it cannot import. Rather than
// keep a second copy of the redirect check in the browser — the kind of
// duplicate that drifts and takes the security property with it — the tested
// module is prepended with its export keywords stripped.
const sharedForBrowser = (await readFile(join(root, "src/redirect.mjs"), "utf8"))
  .replace(/^export /gm, "");
await writeFile(
  join(dist, "app.js"),
  `${sharedForBrowser}\n${await readFile(join(root, "src/assets/app.js"), "utf8")}`,
  "utf8",
);

// A sitemap, so the pages are discoverable.
//
// Driven off the page's own robots meta rather than a list of paths to skip.
// Submitting a noindex page asks Google to index something we have just told
// it not to, and the previous version of this line only knew about the 404,
// so the account pages walked straight into the sitemap.
const indexable = pages.filter((p) => !/content="noindex/.test(p.html));
const sitemapEntry = ({ path }) => {
  // The catalogue moves; the story and policy pages do not.
  const priority = path === "/" ? "1.0"
    : path === "/shop/" || path.startsWith("/oils/") ? "0.9"
    : path.startsWith("/collections/") ? "0.8"
    : "0.6";
  const freq = path === "/shop/" || path.startsWith("/oils/") ? "weekly" : "monthly";
  return [
    "  <url>",
    `    <loc>${site.url}${path}</loc>`,
    `    <lastmod>${BUILD_DATE}</lastmod>`,
    `    <changefreq>${freq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
};
await writeFile(join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexable.map(sitemapEntry).join("\n") +
  `\n</urlset>\n`, "utf8");

await writeFile(join(dist, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "",
    "# Filtered views duplicate the shop page's content.",
    "Disallow: /shop/?collection=",
    "",
    `Sitemap: ${site.url}/sitemap.xml`,
    "",
  ].join("\n"), "utf8");

console.log(`Built ${pages.length} pages into dist/`);
for (const p of pages) console.log("  " + p.path);
