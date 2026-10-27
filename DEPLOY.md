# Deploying, and proving it works

About an hour, most of it waiting on sign-ups. Everything here is free at
this scale, and **nothing in test mode can charge anyone**.

**Most of this does not need Razorpay.** Accounts, the admin pages, contact,
the newsletter and live stock all work without a payment gateway, and
`npm run smoke` proves them against a real database. If you are deferring
payments, do steps 1, 3, 3a and 4, then skip to
[Without Razorpay](#without-razorpay). Only checkout itself needs steps 2
and 6.

Do the steps in order. Step 3a is the one that matters: until the database
code has actually run, none of it is known to work — the test suite covers
pricing and password hashing only, and every SQL statement in this repository
was written and never executed.

### One thing about this repository

`dist/` is **committed on purpose** — `.gitignore` says so — because Vercel
deploys the built site straight from the repository rather than running the
generator. So when you change anything under `src/`, `build.mjs` or the
policies:

```bash
node build.mjs
git add -A
git commit -m "..."
git push
```

A source change pushed without a rebuilt `dist/` deploys the old page, and
looks like the deploy silently failed.

---

## 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) and create a project.
   Pick the region nearest your customers: **AWS Asia Pacific 1
   (Singapore)**, which is the closest option Neon offers to India — roughly
   50–70ms round trip, against about 220ms to anywhere in the US. There is no
   Mumbai region on the free tier. This is the one setting that cannot be
   changed later without creating a new project.

   Under **Services**, leave only **Postgres database** on. Object storage,
   Functions, AI gateway and Realtime are not used by this site, and **Better
   Auth** in particular must stay off — accounts are already built here, in
   `api/_lib/auth.mjs` and the `customers` and `sessions` tables.
2. Copy the **pooled** connection string, the one with `-pooler` in the host.
   It should end in `?sslmode=require`.

The pooled one matters. Serverless functions can start a fresh instance per
request, and the direct endpoint will run out of connections under any real
traffic.

## 2. Payments — Razorpay *(skip if deferring payments)*

1. Sign up at [razorpay.com](https://razorpay.com). You do **not** need
   business verification, PAN or GST yet — those are for live mode.
2. Make sure the dashboard toggle says **Test Mode**.
3. Settings → API Keys → Generate. Copy both halves.
   The id starts `rzp_test_`. **The secret is shown once.**

If the id starts `rzp_live_`, stop — you are in the wrong mode.

Skipping this step leaves `/checkout/` unable to open an order, and affects
nothing else on the site. `npm run smoke` refuses to run at all if it finds a
`rzp_live_` key, so it can never write test rows into a production
database.

## 3. Local credentials

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`. That one is required for anything at all.

If you did step 2, also fill in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`,
and for `RAZORPAY_WEBHOOK_SECRET` invent a long random string now — you will
paste the same one into Razorpay in step 6. If you skipped step 2, leave all
three blank; `npm run db:check` will report them missing, which is correct
and not in your way.

`.env.local` is gitignored. Keep it that way; a leaked key secret lets anyone
take payments as you.

Create the tables and fill the shelves:

```bash
npm run db:setup   # applies db/schema.sql — no psql needed
npm run seed       # one stock row per size, from the catalogue
npm run db:check   # says what is wired up and what is not
```

`db:setup` goes through the same driver the application uses, so psql does
not have to be installed. It is safe to re-run: every statement in
`db/schema.sql` is `if not exists`, so applying it again to a live database
adds what is missing and touches nothing else. Run it again after pulling any
change to the schema.

`db:check` should report **eight tables** (`stock`, `orders`, `order_items`,
`webhook_events`, `customers`, `sessions`, `messages`, `subscribers`), every
column added by a later `alter table`, 50-odd stock rows, and — if you did
step 2 — **TEST mode**. It expects what `db/schema.sql` actually declares
rather than a list written down in the script, so adding a table cannot leave
it reporting a healthy database while that table is missing.

It will warn that there is **no admin account**. That is expected until you
register on the site and run `node db/make-admin.mjs you@example.com`.

## 3a. Prove the database code runs

```bash
npm run smoke
```

This is the step that turns "written" into "known to work". Against your real
database it exercises, in order: creating an account and verifying the
password out of the column it was stored in; a session round-trip through
`currentCustomer`, and an expired session being refused; the admin gate
granting and then revoking on the same session; the login lockout writing a
real timestamp; pricing a cart against live stock and inserting the order and
its items exactly as `/api/checkout` does; settling the payment and taking
stock down; **a second delivery of the same payment changing nothing**, which
is the guard that stops a Razorpay retry decrementing stock twice; the
oversold path, forced deliberately by pulling stock out from under a paid
order; the admin ship `UPDATE`, and the same statement refusing an order that
is not paid; a contact message, a subscriber, and re-subscribing.

It never calls Razorpay, and it **refuses to run** without `DATABASE_URL`, or
with a `rzp_live_` key present.

Everything it writes is marked `smoke+<timestamp>@example.invalid` and removed
on the way out, including when a step fails. If it is ever killed mid-run, the
leftovers are obvious and go away with:

```sql
delete from customers where email like 'smoke+%@example.invalid';
```

Expect `ok` on every line, and `Every database path ran and cleaned up after
itself.` at the end. Anything marked `FAIL` names the statement that broke —
fix it before deploying, because the same statement is in an endpoint.

## 4. Deploy — Vercel

1. [vercel.com](https://vercel.com) → Add New → Project → import the GitHub
   repository.
2. Framework preset: **Other**. The build command and output directory come
   from `vercel.json`; leave them alone.
3. Before the first deploy, add the environment variables from `.env.local`
   under **Settings → Environment Variables**, for all environments.
   `DATABASE_URL` is the only one the site needs in order to work at all; the
   three `RAZORPAY_*` ones are read by `/api/checkout` and the webhook and
   nothing else, so leave them out if you are deferring payments.
4. Deploy.

If you add the variables afterwards, redeploy — they are read at build and
run time, not injected into an existing deployment.

## 5. Prove it in the browser

Replace `<your-app>` with the deployment URL.

**The site is up**

- `https://<your-app>/` loads and looks right.
- `https://<your-app>/api/stock` returns JSON full of `SRV-…` keys.
  If this 404s, the functions did not deploy. If it 503s, `DATABASE_URL` is
  wrong in Vercel.

**Accounts**

- `/account/register/` → create one with a real address you can read.
- The header icon gains a dot; `/account/` greets you by name.
- Log out, log back in.
- Wrong password gives *"Email or password is incorrect"* — the same wording
  as an unknown address, deliberately.

**The gate**

- Log out, add something to the cart, go to `/checkout/`.
  You should be asked to log in, with no address form.

**Contact and the newsletter** *(no Razorpay needed)*

- Send yourself something through `/contact/`. It is stored, not emailed —
  nothing can send email yet, and the form no longer claims otherwise.
- Subscribe through the footer form.
- Register, run `node db/make-admin.mjs you@example.com`, then open
  `/admin/`. Your message is listed; mark it handled and unmark it. Stock is
  listed and editable.
- `/admin/` for a signed-in non-admin answers **404**, not 403 — on purpose,
  so it does not confirm the page is there.

**The money** *(needs steps 2 and 6)*

- Logged in, add an oil **under ₹999** so shipping is charged.
- At `/checkout/`, confirm the summary shows the item, **₹79 shipping** and a
  total that is their sum.
- Pay with test card `4111 1111 1111 1111`, any future expiry, any CVV,
  OTP `1234` if asked.
- You land on `/checkout/thanks/` with an order reference, and the cart empties.

**It actually recorded**

```bash
npm run db:check
```

Paid count should have gone up by one. Then, in the Neon SQL editor:

```sql
select id, status, total_paise, customer_email, created_at
  from orders order by created_at desc limit 5;
```

Status must read **`paid`**, not `created`. If it says `created`, the payment
happened but the webhook did not arrive — go to step 6.

```sql
select sku, quantity from stock order by updated_at desc limit 5;
```

The oil you bought should have gone down by the quantity you bought.

- `/account/` now lists the order.

## 6. The webhook

Do this after the first payment, because it is the step most likely to be
the thing that is wrong.

1. Razorpay → Settings → Webhooks → Add New Webhook.
2. URL: `https://<your-app>/api/razorpay-webhook`
3. Secret: the same string you put in `RAZORPAY_WEBHOOK_SECRET`.
4. Active events: `payment.captured` and `payment.failed`.
5. Place another test order, then check Razorpay's webhook log for a
   **200**.

To see what we were told, whatever we made of it:

```sql
select event_type, received_at, processed_at, error
  from webhook_events order by received_at desc limit 5;
```

`processed_at` null with an `error` means it arrived and we failed on it.
Nothing at all means it never arrived — wrong URL, or the webhook is not
active.

---

## Without Razorpay

If you are deferring payments, this is what you can still prove — which is
most of the site:

| Works without a gateway | Needs Razorpay |
| --- | --- |
| Register, log in, log out, `/account/` | `/checkout/` opening an order |
| The checkout login gate | Taking a payment |
| `/admin/` orders, messages, stock | The webhook settling it |
| `/contact/` and newsletter signup | |
| `/api/stock` and live sold-out marking | |
| Every database path `npm run smoke` covers | |

`npm run smoke` settles an order and ships it with no gateway in the room, by
calling the same database code the webhook calls. What it cannot prove is the
signature check in `api/razorpay-webhook.js`, because only Razorpay can
produce a valid signature — see
[what is still untested](#what-is-still-untested).

---

## When it goes wrong

**`/api/stock` 404s.** The functions did not deploy. Check `api/` is at the
repository root and the build logs mention Serverless Functions.

**`/api/stock` 503s.** `DATABASE_URL` is missing or wrong in Vercel. It is
set separately from your machine.

**Checkout says "We couldn't start that order".** Our side. Vercel →
Logs → `/api/checkout`. Usually a Razorpay key typo or a key secret with a
trailing space.

**Payment succeeds, order stays `created`.** The webhook is not reaching us,
or its secret does not match. This is the one failure that looks fine to the
customer and loses you the order, so check Razorpay's webhook log.

**"Invalid signature" in the logs.** The secrets differ. Set it again in both
places — do not trust a copy-paste that may have taken a newline.

**Everything works but stock does not move.** The order was marked `paid`
without decrementing, which should be impossible; check for `oversold` in
`orders.status`.

---

## Only then, going live

Not before all of the above passes:

- Policy pages: Privacy, Terms, Refund/Cancellation, Shipping. Required by
  the Consumer Protection (E-Commerce) Rules 2020, and Razorpay will not
  activate a live account without them. **These are written, and each one
  carries `TODO` markers for the facts only you can supply** — legal entity,
  GST status, returns window, refund timeline, courier, grievance officer.
  Each one stays visible on the page until you fill it in, which is
  deliberate: a placeholder you can see beats a plausible invention that
  becomes a commitment you never agreed to.
- Business verification with Razorpay: PAN, bank account, GST above the
  threshold.
- Swap both keys to `rzp_live_…`, create a **new** webhook secret, and
  update Vercel. `npm run db:check` will then warn you that real cards are
  live, which is the point.
- Order confirmation emails. Today a customer pays and hears nothing.
- Decide whether ₹79 is actually your shipping fee. It is a placeholder
  chosen so the total could be computed — and the FAQ currently says shipping
  is "calculated at checkout based on your location", which the code does not
  do. One of the two has to change.
- An `/api/unsubscribe` endpoint. Every newsletter signup already stores an
  unsubscribe token and nothing consumes it, so there is no way out of the
  list. That has to exist **before** the first marketing email, not after.

---

## What is still untested

The honest list, after `npm run smoke` passes:

- **The webhook signature check.** Only Razorpay can sign a real delivery, so
  the end-to-end path is proven by step 6 and by nothing else.
- **`createOrder`**, the one call that reaches Razorpay's API. Step 5 is the
  only thing that exercises it.
- **The HTTP layer**: cookies actually being set and returned by a browser,
  `req.body` parsing on Vercel, the honeypot fields. Step 5 in a browser
  proves those; no script does.
- **Concurrency.** Two shoppers buying the last bottle at the same moment is
  the case the `oversold` flag exists for. The smoke test forces that state
  deliberately; it does not race two real requests.
- **Email.** Nothing sends any. An order confirmation, a dispatch notice, a
  password reset and a contact notification are all still missing, and the
  site is careful not to promise them.
