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
