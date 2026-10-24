# Sarvha Global — D2C Essential Oils Storefront

A fast, dependency-free storefront for a direct-to-consumer essential-oil brand.
No build step, no framework — three files you can host anywhere.

> **Note:** The product names, prices, stock counts and review quotes are still
> placeholders. Swap them for real data before launch.

## Running it locally

Any static file server works:

```bash
python -m http.server 4321
```

Then open <http://localhost:4321>.

## Project structure

| File | What's in it |
|---|---|
| `index.html` | Page structure, SEO metadata, JSON-LD store schema |
| `styles.css` | Design tokens, layout, components, responsive rules |
| `script.js` | Catalog data, rendering, filtering, search, cart |

## Editing the catalog

Everything the shop sells lives in the `PRODUCTS` array at the top of `script.js`.
Each product has one or more `variants`, so sizes are priced and stocked separately:

```js
{
  id: "lavender",
  name: "Lavender",
  latin: "Lavandula angustifolia",
  type: "single",            // single | blend | carrier | kit
  rating: 4.9, reviews: 612,
  badge: "Bestseller",       // optional ribbon
  color: "#9b87c4",          // bottle label colour
  bg: "#ece6f4",             // card background
  needs: ["sleep", "calm"],  // drives "Shop by need" + search
  origin: "Bulgaria",
  method: "Steam distilled",
  desc: "Floral, soft and soothing. The classic wind-down oil.",
  notes: "Sweet, herbaceous, powdery",
  variants: [
    { size: "10 ml", price: 449, stock: 24 },
    { size: "30 ml", price: 1099, stock: 11 },
  ],
}
```

Set a variant's `stock` to `0` and it shows as sold out automatically. Add an entry to
`NEEDS` to create a new "Shop by need" category. Currency and the free-shipping
threshold are in the `STORE` object at the top of the same file.

## Features

- Product grid with category filters, sorting and text search (matches name, latin
  name, aroma notes, origin and need tags)
- Per-size variants with independent pricing and stock, sold-out states and
  low-stock nudges
- Product detail modal with size picker, quantity stepper and related products
- Cart drawer with quantity controls, free-shipping progress and `localStorage`
  persistence
- Keyboard accessible throughout: focus trapping in the cart and modal, focus
  restoration on close, Escape to dismiss, `/` to jump to search, skip link
- Respects `prefers-reduced-motion`
- SEO metadata, Open Graph tags and JSON-LD structured data for the catalog
- Responsive from 375px up; illustrations are inline SVG, so there are no image
  assets to host

## Not built yet

Checkout is a placeholder — `[data-checkout]` in `script.js` is where an order
should be created and handed to a payment gateway. There is no backend: no real
inventory, orders, accounts or payments.
