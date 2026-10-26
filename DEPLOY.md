# Deploying, and proving it works

About an hour, most of it waiting on sign-ups. Everything here is free at
this scale, and **nothing in test mode can charge anyone**.

Do the steps in order. Step 5 is the one that matters — until a test order
has gone all the way through, none of this is known to work.

---

## 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) and create a project.
   Pick the region nearest your customers: **AWS ap-south-1 (Mumbai)**.
2. Copy the **pooled** connection string, the one with `-pooler` in the host.
   It should end in `?sslmode=require`.

The pooled one matters. Serverless functions can start a fresh instance per
request, and the direct endpoint will run out of connections under any real
traffic.

## 2. Payments — Razorpay

1. Sign up at [razorpay.com](https://razorpay.com). You do **not** need
   business verification, PAN or GST yet — those are for live mode.
2. Make sure the dashboard toggle says **Test Mode**.
3. Settings → API Keys → Generate. Copy both halves.
   The id starts `rzp_test_`. **The secret is shown once.**

If the id starts `rzp_live_`, stop — you are in the wrong mode.

## 3. Local credentials

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. For
`RAZORPAY_WEBHOOK_SECRET` invent a long random string now — you will paste
the same one into Razorpay in step 6.

`.env.local` is gitignored. Keep it that way; a leaked key secret lets anyone
take payments as you.

Create the tables and fill the shelves:

```bash
npm run db:setup
npm run seed
npm run db:check
```

`db:check` should report six tables, 50-odd stock rows and **TEST mode**. If
it doesn't, fix that before going further — everything downstream assumes it.

## 4. Deploy — Vercel

1. [vercel.com](https://vercel.com) → Add New → Project → import the GitHub
   repository.
2. Framework preset: **Other**. The build command and output directory come
   from `vercel.json`; leave them alone.
3. Before the first deploy, add the four environment variables from
   `.env.local` under **Settings → Environment Variables**, for all
   environments.
4. Deploy.

If you add the variables afterwards, redeploy — they are read at build and
run time, not injected into an existing deployment.

## 5. Prove it

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

**The money**

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
  activate a live account without them. **The site has none.**
- Business verification with Razorpay: PAN, bank account, GST above the
  threshold.
- Swap both keys to `rzp_live_…`, create a **new** webhook secret, and
  update Vercel. `npm run db:check` will then warn you that real cards are
  live, which is the point.
- Order confirmation emails. Today a customer pays and hears nothing.
- Decide whether ₹79 is actually your shipping fee. It is a placeholder I
  chose so the total could be computed.
