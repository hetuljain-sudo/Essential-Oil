# Sarvha — D2C Essential Oils Storefront

A multi-page storefront for a direct-to-consumer essential oil brand. Static HTML
generated from a single data file — no framework, no runtime dependencies, and
nothing to install except Node for the build.

> **Placeholders:** prices, stock counts, the phone number and the postal address
> are made up. Product photography is Unsplash stock standing in until real photos
> exist. Everything else — product copy, usage notes, FAQ answers — is the brand's
> own writing, carried over from an earlier Next.js build of this site.

## Getting started

```bash
node build.mjs
python -m http.server 4321 --directory dist
```

Then open <http://localhost:4321>. Or `npm run dev` to do both at once.

Re-run the build after any change to `src/`.

## Pages

23 pages, all generated:

| Route | Contents |
| --- | --- |
| `/` | Hero, featured oils, collections, the Oil Library, how we work |
| `/shop/` | All 12 oils with search, collection filters and sorting |
| `/collections/` | The four collections with their write-ups |
| `/collections/<id>/` | One page each for relaxation, energy, immunity, skincare |
| `/oils/<slug>/` | One page per product — 12 in total |
| `/about/` | Why the brand exists and what it will and won't claim |
| `/faq/` | 19 questions in four categories, with jump links |
| `/contact/` | Contact details and a message form |
| `/404.html` | Not-found page |

Plus `sitemap.xml` and `robots.txt`.

The shop's filters are deep-linkable: `/shop/?collection=energy` loads with that
collection selected.

## Project structure

```
build.mjs              # Generator — reads src/, writes dist/
src/
├── data.mjs           # ALL content: products, collections, FAQs, site details
├── templates.mjs      # Page chrome and shared components
└── assets/
    ├── styles.css     # Base design system
    ├── pages.css      # Multi-page layer (product pages, collections, FAQ…)
    └── app.js         # Cart, mobile menu, shop filtering, product picker
dist/                  # Generated — do not edit by hand
```

`dist/` is committed so the site can be deployed straight from the repo.

## Editing content

Everything lives in [`src/data.mjs`](src/data.mjs). Change it, re-run the build,
and every page that mentions it updates.

Each product has one or more `variants`, so sizes are priced and stocked
independently:

```js
{
  id: "lavender-fields",              // becomes /oils/lavender-fields/
  name: "Lavender Fields",
  botanical: "Lavandula angustifolia",
  category: "relaxation",             // relaxation | energy | immunity | skincare
  featured: true,                     // shows in "Start here" on the homepage
  badge: "Rare",                      // optional ribbon
  tagline: "Steam-distilled from high-altitude Provençal blooms.",
  desc: "Soft, powdery and unmistakably floral…",
  ingredients: ["100% pure Lavandula angustifolia flower oil"],
  usage: ["Add 4–6 drops to a diffuser an hour before bed.", …],
  notes: ["Powdery floral", "Fresh herb", "Soft balsamic base"],
  origin: "Provence, France",
  method: "Steam distilled",
  swatch: ["#9a8fc4", "#6d5fa3"],     // colours for the fallback bottle art
  bg: "#ece6f4",                      // card background
  image: { src: "https://…", alt: "…" },
  variants: [
    { size: "15 ml", price: 699, stock: 24 },
    { size: "30 ml", price: 1299, stock: 11 },
  ],
}
```

Set a variant's `stock` to `0` and that size shows as sold out; set every variant
to `0` and the product does. Stock at 8 or below shows a "Only N left" nudge.

Adding a product to the array creates its page. Adding one to `categories`
creates a collection page. Adding one to `faqs` adds a question under its
category heading.

## Editorial content on product pages

Each oil page carries four sections beyond the buy box, written per product in
[`src/content.mjs`](src/content.mjs):

- **Who it's for** — three situations the oil actually suits
- **What people get wrong** — the mistakes people make with that specific oil
- **What it won't do** — limitations, stated plainly
- **Questions about this oil** — specific questions, plus shared ones the build
  derives from the product's own data

The derived questions adapt to the product: carriers are asked "do I need to
dilute it?" while essential oils get a dilution figure and an internal-use
answer; shelf life differs for cold-pressed citrus; and an oil with a `warning`
has it folded into its dilution answer. So a new product gets a sensible FAQ
even with no entry in `content.mjs`.

Every product page emits `Product` and `FAQPage` structured data together in an
`@graph`, which makes the questions eligible to appear in search results
alongside the price.

**On what the copy may claim.** The "what it won't do" sections exist partly as
positioning and partly because India's Drugs and Magic Remedies (Objectionable
Advertisements) Act 1954 prohibits advertising that claims to treat or cure
listed conditions, and ASCI polices unsubstantiated health claims. Describe how
an oil smells and how people use it. Never say what it treats.

## Where the catalogue came from

50 oils, curated from the ranges our manufacturers actually stock — Katyani
Exports, India Aroma Oils and Shiva Exports. Those are bulk export catalogues
running to roughly 570 SKUs between them, so this is a deliberate selection
rather than a straight import.

**Deliberately excluded.** Aroma chemicals, oleoresins and perfumery raw
materials, which are industrial feedstock rather than retail products. Also
anything unsafe to sell to a consumer in a dropper bottle: calamus
(β-asarone), costus root (IFRA-prohibited sensitiser), thuja (thujone), birch
(methyl salicylate), bitter almond, and civet absolute, which is animal-derived
and would break the cruelty-free claim on every page.

Where a supplier offers both bark and leaf oil of the same plant — cinnamon,
for instance — we list the leaf. Bark oil is a severe skin sensitiser.

**Pricing** is derived from the suppliers' published wholesale rates (India
Aroma Oils quotes in INR from 50 ml upward) scaled to retail volumes with a
retail margin. Treat the numbers as a starting point, not a decision: they do
not yet account for your bottling, labelling, packaging or payment-gateway
costs.

**Copy is ours.** None of the product descriptions are copied from supplier
sites — reusing them would be an infringement, and duplicate text would be
penalised in search.

Products carrying a `warning` field render a safety note on their page. This is
set for phototoxic oils (bergamot, grapefruit) and strong sensitisers (clove
bud, cinnamon leaf), and for oils to avoid in pregnancy.

## Product photography

Swap a product's `image.src` for your own file and it is used immediately. If an
image fails to load, the page falls back to generated SVG bottle artwork tinted
with that product's `swatch`, so the grid never shows a broken image. Delete
`image` entirely and the artwork is used directly.

Current photography is Unsplash stock in one house style — an unbranded amber
dropper bottle with botanicals, on warm natural surfaces — so the grid reads as a
set. The Unsplash licence allows commercial use without attribution.

## On the copy

The About page and the sourcing FAQs deliberately avoid claims the business can't
back up. There is no invented review count, no star rating, and no claim of
independent lab testing — the FAQ says plainly that this is a young business that
won't overstate its testing programme. Add those claims back only when they are
true, and keep in mind that India's ASCI code and the Legal Metrology
(Packaged Commodities) Rules both apply to what a store says about its products.

## Not built yet

The site is front-end only:

- **Checkout does nothing.** `[data-checkout]` in [`src/assets/app.js`](src/assets/app.js)
  is where an order should be created and handed to a payment gateway.
- **The contact form sends nothing.** It validates and clears.
- **Stock is static.** The counts in `data.mjs` don't decrease when something sells.

The cart itself is real — it persists in `localStorage` across pages and reloads.

## Deploying

`dist/` is a plain static folder. Drop it on Netlify, Vercel, Cloudflare Pages or
GitHub Pages. Set `/404.html` as the not-found page if your host asks.

## The journal

`/blog/` plus a page per post, generated from [`src/posts.mjs`](src/posts.mjs).

Posts carry `draft: true` until they are ready; the build skips them, and the
index renders an empty state when nothing is published. The four entries in
there now are unpublished examples of shape — replace or delete them.

A post's `body` is a list of blocks, so there is no Markdown step:

```js
body: [
  ["p", "A paragraph."],
  ["h2", "A heading"],
  ["ul", ["a bullet", "another"]],
  ["ol", ["first step", "second step"]],
  ["note", "A highlighted aside."],
  ["table", [["Header", "Header"], ["cell", "cell"]]],
]
```

Reading time is calculated from the word count — don't set it by hand. Listing
product ids in `related` puts those oils in a card row at the foot of the post.
Each post emits `BlogPosting` structured data, and the index emits `Blog`.

Same rule as the product pages: describe how oils smell and how people use
them, never what they treat.

## SEO

```bash
npm run seo
```

Builds, then audits every page for title and description length, heading
structure, canonical and social tags, image alt text and dimensions,
structured data completeness, and whether referenced assets exist.

What the site emits:

- **Titles** built for search intent — `Lavender Fields Essential Oil — 15 ml
  & 30 ml | Sarvha` rather than just the product name — kept under 60
  characters so they don't truncate
- **Descriptions** clamped to 158 characters at a word boundary
- **Structured data** per page in a single `@graph`: `Organization` and
  `WebSite` (with a `SearchAction` for the sitelinks search box) on the home
  page, `Product` + `FAQPage` on every oil, `CollectionPage` + `ItemList` on
  shop and collection pages, `AboutPage`, `ContactPage`, and a
  `BreadcrumbList` on all 60 inner pages
- **Offers** carrying SKU, `priceValidUntil`, `itemCondition`, seller, a
  30-day `MerchantReturnPolicy` and `OfferShippingDetails` — the fields
  Google needs before it will show price and availability in results
- **Social cards** using the product's own photography, with `og:locale`,
  `og:image:alt` and Twitter equivalents
- **`lang="en-IN"`**, explicit `robots` directives, `noindex` on the 404
- **Sitemap** with `lastmod`, `changefreq` and per-section `priority`;
  **robots.txt** disallowing the filtered `?collection=` views, which
  duplicate the shop page

**The one remaining gap** is photography. 38 of the 50 oils have no product
image, so those pages have no `og:image` and their `Product` schema has no
`image` — which Google requires for product rich results. Adding a photo to a
product fixes both at once.

## Collection hub pages

Collection pages are where commercial search lands — "essential oils for
sleep" is a far bigger query than any product name — so they carry real
content rather than just a grid.

Editorial lives in [`src/collections.mjs`](src/collections.mjs), keyed by
category id: a `lede`, a `startHere` recommendation with reasoning,
`choosing` guidance, `uses`, and per-collection `faqs` that also emit
FAQPage structured data.

Everything else is derived from the product data — the at-a-glance facts,
the scent-family sub-groups, and the comparison table listing every oil in
the collection with its botanical name, character, sizes, price and whether
it carries a safety note.

Sub-grouping uses each product's `family` field. Keyword-derived grouping was
tried first and misfired — ginger read as citrus because of a "lemon peel"
note, clove as woody — so families are assigned explicitly.

## The footer

The footer doubles as a secondary sitemap. Six columns — contact, Shop,
By scent, Popular oils, Learn, Company — give every page 38 outbound links
instead of 15, which is how a flat catalogue gets internal links pointing at
its depth.

"By scent" links to scent-family anchors on the collection pages
(`/collections/energy/#citrus`), so the families are reachable without
needing pages of their own.

Columns are `<details>` elements that ship open, so every link is in the
markup for crawlers and for anyone without JavaScript. On screens under
860px, `app.js` closes all but the first — six stacked columns is an
unusable wall on a phone.

## Guides

Four reference pages at `/guides/` that answer a question rather than sell a
product — dilution, phototoxicity, pregnancy and pet safety, and diffuser use.
Prose lives in [`src/guides.mjs`](src/guides.mjs).

**The tables are generated, not written.** Each product carries a structured
`safety` object:

```js
safety: { maxDilution: 0.5, pregnancy: true, children: true, pets: true }
```

A block of `["table:pregnancy"]` in a guide body inserts every oil flagged
`safety.pregnancy`, linked to its own page. Add an oil with that flag and it
appears on the guide automatically — a guide cannot fall out of step with the
catalogue.

Supported blocks: `table:dilution`, `table:maxDilution`, `table:phototoxic`,
`table:pregnancy`, `table:children`, `table:pets`, `table:nutAllergy`,
`table:diffuserCaution`.

Structuring this exposed four products whose prose and data disagreed —
cold-pressed lemon was phototoxic with no warning, peppermint and eucalyptus
said "not for young children" only in their guide text, and tea tree's FAQ
called it toxic to cats and dogs while its page said nothing. All now carry
warnings matching their data.
