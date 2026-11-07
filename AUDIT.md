# Site audit — 6 November 2026

Where Sarvha stands against what a working retail site needs. Everything
below was checked against the code in this repo, not from memory.

---

## 1. What exists and works

### The storefront

| | |
| --- | --- |
| Pages built | 74, from `build.mjs` into `dist/` |
| Products | 50 oils, 78 SKUs across sizes |
| Collections | 7 (relaxation, energy, immunity, skincare, +3) |
| Static pages | home, shop, collections, about, FAQ (55 Q&As), contact, guides, 4 policy pages, 404 |
| Tests | 93, all passing, all database-free |

Working on the front end: product listing with filter and sort, client-side
search over the catalogue, product detail pages with size variants, a cart in
`localStorage` with a drawer, a checkout that recomputes everything
server-side, accounts (register, login, forgot, reset, account page), a
contact form, a newsletter form, and an admin panel with its own chrome.

Technically sound: structured data on every page type (Product, FAQPage,
BreadcrumbList, Organization, Store), `srcset` on catalogue images, a real
404 rather than a soft one, deterministic builds, a sitemap that excludes
noindex pages automatically, skip links and `aria-live` toasts.

### The backend

12 serverless functions — **the Vercel Hobby ceiling, with nothing spare**:

```
checkout, razorpay-webhook, stock, contact, newsletter,
auth/{register, session, account, recover},
admin/{orders, messages, stock}
```

Ten Postgres tables on Neon. The parts that matter are right: the browser is
never believed about money, orders become `paid` only in the signed webhook,
the webhook is idempotent, stock cannot be decremented twice, passwords are
scrypt hashes, session and reset tokens are stored only as SHA-256, cookies
are HttpOnly + Secure + SameSite=Lax, admin is checked in the database on
every request and answers 404 rather than 403.

---

## 2. Blocking — the site cannot legally or practically take money yet

These are in order. Nothing below this section matters until these are done.

1. **23 unfinished policy TODOs** — 5 in privacy, 5 in terms, 8 in refunds,
   5 in shipping. (An earlier draft of this file said 18; that count was
   taken by lines rather than by boxes and was wrong.) Legal entity, GST status, returns window, whether opened
   bottles come back, refund timeline, courier, grievance officer. They
   render as yellow boxes on the live pages right now. Razorpay will not
   approve the account without them, and two are legal requirements in India.
2. **No business registration** — Razorpay needs PAN, a bank account, and GST
   above the threshold.
3. **Razorpay is in test mode.** `rzp_test_…` keys, no live keys, and the
   end-to-end flow (real session → Razorpay order → their payment screen →
   webhook settles it) **has never been run once**. This is the single
   largest unverified path in the project.
4. **No email provider.** Nothing has ever been delivered to an inbox. This
   blocks: order confirmations, the admin thank-you button, password reset
   links (the endpoint refuses with 503 without it), and contact
   notifications. The code paths are written and smoke-tested with an
   injected sender — which is not the same as an email arriving.
5. **No domain.** Still on `oil-ten-omega.vercel.app`.
6. **Hosting is wrong for a shop.** Vercel Hobby forbids commercial use.
   Railway is ~$5/mo, Vercel Pro ~$20/mo. Pro also lifts the 12-function cap.
7. **Reset the Neon password** before real orders — it was shared in a
   screenshot during setup.

---

## 3. Missing for a complete retail site

### Front end

| Gap | Why it matters |
| --- | --- |
| **Real product photography** | All 50 images are Unsplash stock. Generic photos are the clearest signal to a shopper that a shop is not real. The single highest-value thing you can do that needs no code. |
| **Guides** | All six written, none published — shelved 6 November at the owner's request. `/guides/` shows its empty state, which tells visitors the guides are being written. Publishing any of them is deleting one line. |
| **No reviews or ratings** | Deliberate so far — you won't invent them. But there is no mechanism to collect real ones after delivery either. |
| **Shop filters** | Scent family, price band and in-stock-only added 7 November, alongside the existing collection chips, search and sort. All of it is in the URL, so a filtered view can be shared. |
| **Wishlist** | Added 7 November. A heart on every card and product page, a `/saved/` page, and a counter in the header that appears once the list has something in it. Kept in `localStorage`, so it does not follow you to another device — tying it to the account needs a function slot and there are none. The page says so. |
| **Discount codes** | Added 7 November. Percentage or fixed amount, with an optional minimum spend, usage limit and expiry; made and retired from a Codes tab in the admin. The server prices every code, shipping is never discounted, and a code counts as used when payment settles rather than when a checkout starts. |
| **No "notify me when back in stock"** | Sold-out variants are a dead end. |
| **Gift sets** | Four added 6 November: Sleep & Unwind, Bright Mornings, Seasonal Care and the Carrier Oil Duo, each priced 9–11% under its parts. Each is a product with its own SKU and stock, so it is a box you assemble and count. No photographs of the boxes yet. |
| **Cart does not survive a device change** | `localStorage` only, not tied to the account. |
| **Colour contrast** | Fixed 6 November: sage and terracotta as small text measured 3.1:1 and 4.2:1 against WCAG AA's 4.5:1, and white on the terracotta newsletter band measured 4.3:1. Darker text variants of both hues now carry the words; the brand colours still carry the decoration. |
| **No analytics at all** | You cannot see what sells, where people drop out, or whether anyone arrives. |

### Back end

| Gap | Why it matters |
| --- | --- |
| **No unsubscribe endpoint** | Every signup mints an `unsubscribe_token` and nothing consumes it. Must exist **before** the first marketing email, not after. No function slot is free for it. |
| **Email addresses are unverified** | Anyone can register as anyone. Matters much more once email is actually sent. |
| **Rate limiting is per account, not per IP** | Ten failed logins locks an email for 15 minutes — which means anyone can deliberately lock out an address they know. The fix is edge rate limiting by IP. |
| **No invoices** | Indian retail generally needs a GST invoice per order. Nothing generates one. |
| **No refund or cancellation flow** | The refunds policy will promise something no code can carry out. Today a refund is a manual action in the Razorpay dashboard with nothing recorded against the order. |
| **No shipping integration** | Flat ₹79 under ₹999, typed by hand. No courier, no label, no pincode serviceability check, no delivery estimate. |
| **Stock is not reserved at checkout** | Deliberate and documented — the second buyer of the last bottle gets `oversold` and a human deals with it. Fine at low volume, a problem at higher. |
| **One address per customer** | Overwritten each checkout. No chooser. |
| **Backups are manual** | `npm run db:export` writes a full copy to `backups/<timestamp>/` — added 6 November. Nothing runs it on a schedule, so it is only as good as the last time somebody typed it. |
| **No error monitoring** | A function that starts throwing in production tells nobody. |

---

## 4. What I would do next, in order

**Needs nothing from anyone else — can start today:**

1. Real product photography (or at minimum, consistent, honest photos of the
   actual bottles).
2. Decide what to do with the six written guides, or drop the promise from `/guides/`.
3. ~~Show the tracking reference to the customer~~ — done 6 November.
4. ~~Fix `BACKEND.md`~~ — done 6 November.
5. ~~Resolve the FAQ/code disagreement about shipping~~ — done 6 November.
   The FAQ had in fact already been corrected; what was left was a stale
   CONFLICT notice published on `/shipping/`.

**Needs the business registration you're already doing:**

6. Answer the 18 policy TODOs.
7. Set up email (Brevo) — this alone unblocks four finished features.
8. Razorpay live keys, then run the full payment path end to end once.
9. Domain, then move off Hobby to Railway or Vercel Pro.

**Then, to be a complete shop:**

10. ~~Discount codes~~ — done 7 November.
11. Unsubscribe endpoint, before any marketing email.
12. GST invoices.
13. Analytics.
14. Back-in-stock notifications. (Gift sets and the wishlist are done.)

---

**Two claims in the first version of this file were wrong**, found by
checking rather than remembering: the policy TODOs number 23, not 18, and
the 10% newsletter offer had already been withdrawn. Both are corrected
above.

*Written against commit `b32eaf0`. 93 tests passing, SEO audit clean,
`dist/` builds deterministically.*
