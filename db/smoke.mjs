/**
 * Run the database code paths that have never run.
 *
 *   npm run smoke
 *
 * The test suite covers pricing and password hashing: pure functions, no
 * database. Every SQL statement in this repository has therefore only ever
 * been read, never executed. A wrong column name, a cast that does not
 * parse, a `returning` that names something absent — none of it would be
 * caught by anything that exists.
 *
 * So this writes rows. Against a real database. Which is why the first thing
 * it does is refuse to run anywhere it might matter:
 *
 *   - no DATABASE_URL, no run
 *   - a live Razorpay key in the environment means this is the production
 *     deployment's configuration, and it stops
 *
 * Everything it creates carries a marker — smoke+<timestamp>@example.invalid,
 * and `.invalid` is reserved by RFC 2606 precisely so it can never be real
 * mail — and is removed on the way out, including when a step fails. If the
 * process is killed hard enough to skip that, what is left behind is
 * obviously test data:
 *
 *   delete from customers where email like 'smoke+%@example.invalid';
 *
 * which takes its sessions and orders with it by cascade.
 *
 * It never calls Razorpay. The payment half of an order is a signature check
 * in api/razorpay-webhook.js and the database work in api/_lib/orders.mjs;
 * only the first needs Razorpay, and this exercises the second directly.
 */

import { db, stockMap } from "../api/_lib/db.mjs";
import {
  hashPassword, verifyPassword, newSessionToken, currentCustomer, SESSION_COOKIE,
} from "../api/_lib/auth.mjs";
import { currentAdmin } from "../api/_lib/admin.mjs";
import { priceCart, catalogue } from "../api/_lib/pricing.mjs";
import { markPaid, markFailed } from "../api/_lib/orders.mjs";
import { parseQuantity } from "../api/_lib/validate.mjs";

// ------------------------------------------------------------------ output
// Same shape as db/check.mjs, so two scripts do not need two readings.

let failures = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => console.log(`  warn  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); failures++; };

/**
 * Run one step. A step that throws is a failure, not a crash: the remaining
 * steps still run and — this is the point — the cleanup at the end still
 * happens.
 */
async function step(name, fn) {
  try {
    const note = await fn();
    ok(note ? `${name} — ${note}` : name);
    return true;
  } catch (err) {
    bad(`${name}: ${err.message}`);
    return false;
  }
}

const assert = (cond, message) => { if (!cond) throw new Error(message); };

// ------------------------------------------------------------------- guards

if (!process.env.DATABASE_URL) {
  console.error(
    "\nDATABASE_URL is not set, and this script writes rows — it will not guess\n" +
    "at a database. Put it in .env.local and run: npm run smoke\n",
  );
  process.exit(1);
}

if ((process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live")) {
  console.error(
    "\nRAZORPAY_KEY_ID is a LIVE key, so this environment is configured for real\n" +
    "payments and this database is very likely the real one. Refusing to write\n" +
    "test rows into it. Run this against a development database only.\n",
  );
  process.exit(1);
}

// --------------------------------------------------------------- the fixture

const sql = db();

const stamp = Date.now();
const email = `smoke+${stamp}@example.invalid`;
const password = "a-long-enough-smoke-password";

/** Everything to undo, newest first. Appended to as the run proceeds. */
const created = { customerId: null, orderIds: [], messageIds: [], subscriber: null };

/** sku -> quantity as it was before we touched it, so it can be put back. */
const stockBefore = new Map();

console.log(`\nSmoke test — marker ${email}`);
console.log("Writing to the database named in DATABASE_URL.\n");

// A request object shaped the way the endpoints read one: currentCustomer
// and currentAdmin take `req` and want nothing from it but a cookie header.
const reqWith = (token) => ({ headers: { cookie: `${SESSION_COOKIE}=${token}` } });

console.log("Accounts");

let sessionToken = null;

await step("connect", async () => {
  const [row] = await sql`select version() as v`;
  return String(row.v).split(" ").slice(0, 2).join(" ");
});

await step("create a customer with hashPassword", async () => {
  const hash = await hashPassword(password);
  const [row] = await sql`
    insert into customers (email, password_hash, name, phone)
    values (${email}, ${hash}, ${"Smoke Test"}, ${null})
    on conflict (email) do nothing
    returning id, email`;
  assert(row, "insert returned no row — does that email already exist?");
  created.customerId = row.id;
  return row.id;
});

await step("the stored hash verifies, and a wrong password does not", async () => {
  const [row] = await sql`select password_hash from customers where id = ${created.customerId}`;
  assert(row, "the customer we just created is not there");
  assert(await verifyPassword(password, row.password_hash), "the right password was rejected");
  assert(!await verifyPassword(password + "x", row.password_hash), "a wrong password was accepted");
  return "round-trips through the column";
});

await step("create a session and find it with currentCustomer", async () => {
  const { token, tokenHash } = newSessionToken();
  sessionToken = token;
  // The same `now() + $1::interval` form api/auth/login.js uses. Worth
  // executing: a parameter followed by a cast is exactly the shape that
  // either works or fails at the database, never in review.
  await sql`
    insert into sessions (token_hash, customer_id, expires_at)
    values (${tokenHash}, ${created.customerId}, now() + ${"30 days"}::interval)`;

  const found = await currentCustomer(sql, reqWith(token));
  assert(found, "currentCustomer did not find a session we just inserted");
  assert(found.id === created.customerId, "currentCustomer returned a different customer");
  return found.email;
});

await step("an expired session is NOT accepted", async () => {
  const { token, tokenHash } = newSessionToken();
  await sql`
    insert into sessions (token_hash, customer_id, expires_at)
    values (${tokenHash}, ${created.customerId}, now() - ${"1 hour"}::interval)`;

  const found = await currentCustomer(sql, reqWith(token));
  await sql`delete from sessions where token_hash = ${tokenHash}`;
  assert(found === null, "an expired session was accepted — expiry is not enforced");
  return "expiry is enforced in the query";
});

await step("currentAdmin refuses an ordinary account", async () => {
  const found = await currentAdmin(sql, reqWith(sessionToken));
  assert(found === null, "a non-admin passed the admin gate");
  return "is_admin = false keeps them out";
});

await step("currentAdmin accepts one with the flag, then stops when revoked", async () => {
  await sql`update customers set is_admin = true where id = ${created.customerId}`;
  const granted = await currentAdmin(sql, reqWith(sessionToken));
  assert(granted, "the admin flag was set and the gate still refused");

  // Revoking must take effect on the next request, not whenever the session
  // expires — that is the reason currentAdmin is a second query.
  await sql`update customers set is_admin = false where id = ${created.customerId}`;
  const revoked = await currentAdmin(sql, reqWith(sessionToken));
  assert(revoked === null, "revoking is_admin did not close the admin gate");
  return "granted and revoked on the same session";
});

await step("the login lockout writes a real timestamp", async () => {
  // The branch that used to interpolate a nested sql`` template and throw.
  // Ten minutes expressed the way api/auth/login.js expresses it.
  const lockMinutes = 15;
  await sql`
    update customers
       set failed_logins = 10,
           locked_until = case
             when ${lockMinutes}::int is null then null
             else now() + (${lockMinutes}::int * interval '1 minute')
           end
     where id = ${created.customerId}`;

  const [row] = await sql`select locked_until from customers where id = ${created.customerId}`;
  assert(row.locked_until, "locked_until was not set");
  assert(new Date(row.locked_until) > new Date(), "locked_until is in the past");

  // And the null branch of the same statement.
  const none = null;
  await sql`
    update customers
       set failed_logins = 0,
           locked_until = case
             when ${none}::int is null then null
             else now() + (${none}::int * interval '1 minute')
           end
     where id = ${created.customerId}`;
  const [cleared] = await sql`select locked_until from customers where id = ${created.customerId}`;
  assert(cleared.locked_until === null, "clearing locked_until did not work");
  return "set and cleared";
});

await step("save a delivery address on the account", async () => {
  // Checkout writes this back on every order; the columns were added by a
  // later `alter table`, so this is the statement a stale database breaks.
  await sql`
    update customers
       set name = coalesce(nullif(${"Smoke Test"}, ''), name),
           phone = coalesce(nullif(${"9876543210"}, ''), phone),
           address_line1 = ${"1 Test Lane"},
           address_line2 = ${null},
           address_city = ${"Pune"},
           address_state = ${"Maharashtra"},
           address_postcode = ${"411001"}
     where id = ${created.customerId}`;

  const [row] = await sql`
    select address_line1, address_city, address_postcode, phone
      from customers where id = ${created.customerId}`;
  assert(row.address_city === "Pune", "the address did not save");
  assert(row.phone === "9876543210", "the phone did not save");
  return "the columns added by alter table are there";
});

// ---------------------------------------------------------------- the order

console.log("\nOrders");

/** The sku we will buy, and how many. Picked from real stock, not invented. */
let buy = null;

await step("pick a sku that is actually in stock", async () => {
  const stock = await stockMap();
  const candidate = [...catalogue.keys()].find((sku) => (stock[sku] ?? 0) >= 2);
  assert(candidate, "no sku has 2 or more in stock — run: npm run seed");
  buy = { sku: candidate, qty: 1, ...catalogue.get(candidate) };
  return `${buy.sku}, ${stock[candidate]} on hand`;
});

let priced = null;

await step("price a cart with priceCart against real stock", async () => {
  priced = priceCart(
    [{ id: buy.productId, size: buy.size, qty: buy.qty }],
    await stockMap(),
  );
  assert(priced.lines.length === 1, "expected one line");
  assert(priced.totalPaise > 0, "a total of zero would fail the orders check constraint");
  return `total ${priced.totalPaise} paise (${priced.shippingPaise} shipping)`;
});

const rpOrderId = `smoke_order_${stamp}`;

await step("insert the order exactly as api/checkout.js does", async () => {
  const [order] = await sql`
    insert into orders (
      customer_id,
      razorpay_order_id, subtotal_paise, shipping_paise, total_paise,
      customer_name, customer_email, customer_phone,
      address_line1, address_line2, address_city, address_state,
      address_postcode, address_country, notes
    ) values (
      ${created.customerId},
      ${rpOrderId},
      ${priced.subtotalPaise}, ${priced.shippingPaise}, ${priced.totalPaise},
      ${"Smoke Test"}, ${email}, ${"9876543210"},
      ${"1 Test Lane"}, ${null}, ${"Pune"},
      ${"Maharashtra"}, ${"411001"}, ${"IN"}, ${"smoke test — safe to delete"}
    ) returning id`;
  assert(order?.id, "the order insert returned no id");
  created.orderIds.push(order.id);
  return order.id;
});

await step("insert the order items", async () => {
  for (const l of priced.lines) {
    await sql`
      insert into order_items (order_id, sku, product_id, name, size, qty, unit_price_paise, line_paise)
      values (${created.orderIds[0]}, ${l.sku}, ${l.productId}, ${l.name}, ${l.size},
              ${l.qty}, ${l.unitPricePaise}, ${l.linePaise})`;
  }
  const [{ n }] = await sql`
    select count(*)::int as n from order_items where order_id = ${created.orderIds[0]}`;
  assert(n === priced.lines.length, `expected ${priced.lines.length} items, found ${n}`);
  return `${n} item(s)`;
});

await step("the order is visible to /api/auth/me's query", async () => {
  // Not reachable until it is paid, so this only proves the join and the
  // json_agg parse. The status filter is checked after markPaid below.
  const rows = await sql`
    select o.id, o.status, o.total_paise,
           coalesce(
             json_agg(json_build_object('name', i.name, 'size', i.size, 'qty', i.qty)
                      order by i.id)
             filter (where i.id is not null),
             '[]'
           ) as items
      from orders o
      left join order_items i on i.order_id = o.id
     where o.customer_id = ${created.customerId}
     group by o.id`;
  assert(rows.length === 1, `expected one order for this customer, found ${rows.length}`);
  const items = typeof rows[0].items === "string" ? JSON.parse(rows[0].items) : rows[0].items;
  assert(Array.isArray(items) && items.length === 1, "json_agg did not produce the items");
  return `json_agg returned ${items.length} item`;
});

// -------------------------------------------------------- payment, simulated

console.log("\nPayment settlement (no Razorpay involved)");

await step("note the stock level before settling", async () => {
  const [row] = await sql`select quantity from stock where sku = ${buy.sku}`;
  stockBefore.set(buy.sku, row.quantity);
  return `${buy.sku} at ${row.quantity}`;
});

await step("markPaid settles the order and takes the stock down", async () => {
  const result = await markPaid(sql, {
    order_id: rpOrderId,
    id: `smoke_pay_${stamp}`,
    amount: priced.totalPaise,
  });
  assert(result.settled, "markPaid did not settle an order sitting at 'created'");
  assert(!result.oversold, "it flagged oversold with stock on the shelf");

  const [order] = await sql`select status, paid_at, razorpay_payment_id from orders where id = ${created.orderIds[0]}`;
  assert(order.status === "paid", `status is ${order.status}, expected paid`);
  assert(order.paid_at, "paid_at was not set");
  assert(order.razorpay_payment_id, "razorpay_payment_id was not recorded");

  const [stock] = await sql`select quantity from stock where sku = ${buy.sku}`;
  const expected = stockBefore.get(buy.sku) - buy.qty;
  assert(stock.quantity === expected, `stock is ${stock.quantity}, expected ${expected}`);
  return `paid, ${buy.sku} ${stockBefore.get(buy.sku)} -> ${stock.quantity}`;
});

await step("a SECOND delivery of the same payment changes nothing", async () => {
  // The redelivery guard. Razorpay retries on any non-2xx and re-sends the
  // same event; without `and status = 'created'` this would decrement stock
  // again, for one order, forever. Never executed until now.
  const before = (await sql`select quantity from stock where sku = ${buy.sku}`)[0].quantity;

  const result = await markPaid(sql, {
    order_id: rpOrderId,
    id: `smoke_pay_${stamp}`,
    amount: priced.totalPaise,
  });
  assert(!result.settled, "a repeat delivery settled the order a second time");

  const after = (await sql`select quantity from stock where sku = ${buy.sku}`)[0].quantity;
  assert(after === before, `stock moved on redelivery: ${before} -> ${after}`);
  return `stock held at ${after}`;
});

await step("a paid order reaches /api/auth/me's status filter", async () => {
  const rows = await sql`
    select o.id from orders o
     where o.customer_id = ${created.customerId}
       and o.status in ('paid', 'oversold')`;
  assert(rows.length === 1, "a paid order is not visible on the account page");
  return "visible in order history";
});

// ------------------------------------------------------------- admin: ship

console.log("\nAdmin");

await step("the admin orders list query runs", async () => {
  // Selects many columns of `orders` while grouping by o.id alone, which
  // Postgres allows only through the primary-key functional dependency. That
  // is the kind of thing that is either fine or a hard error, and nothing
  // had ever asked.
  const orders = await sql`
    select o.id, o.status, o.total_paise, o.shipping_paise, o.created_at,
           o.paid_at, o.shipped_at, o.tracking,
           o.customer_name, o.customer_email, o.customer_phone,
           o.address_line1, o.address_line2, o.address_city,
           o.address_state, o.address_postcode, o.notes,
           coalesce(
             json_agg(json_build_object(
               'name', i.name, 'size', i.size, 'qty', i.qty,
               'linePaise', i.line_paise
             ) order by i.id) filter (where i.id is not null),
             '[]'
           ) as items
      from orders o
      left join order_items i on i.order_id = o.id
     group by o.id
     order by
       case o.status when 'oversold' then 0 when 'paid' then 1 else 2 end,
       o.created_at desc
     limit 100`;
  assert(orders.length >= 1, "the admin list came back empty with an order present");

  const [counts] = await sql`
    select count(*) filter (where status = 'paid')::int as to_ship,
           count(*) filter (where status = 'oversold')::int as oversold,
           coalesce(sum(total_paise) filter (where status in ('paid','shipped')), 0)::bigint as taken_paise
      from orders`;
  assert(counts.to_ship >= 1, "the to-ship count does not see our paid order");
  return `${orders.length} order(s) listed, ${counts.to_ship} to ship`;
});

await step("the ship UPDATE marks a paid order shipped", async () => {
  const [order] = await sql`
    update orders
       set status = 'shipped', shipped_at = now(), tracking = ${"SMOKE-AWB-1"}
     where id = ${created.orderIds[0]} and status = 'paid'
     returning id, customer_email`;
  assert(order, "a paid order refused to ship");

  const [row] = await sql`select status, shipped_at, tracking from orders where id = ${order.id}`;
  assert(row.status === "shipped", `status is ${row.status}`);
  assert(row.shipped_at, "shipped_at was not set");
  assert(row.tracking === "SMOKE-AWB-1", "tracking was not stored");
  return `tracking ${row.tracking}`;
});

await step("the same UPDATE refuses an order that is not paid", async () => {
  // Already shipped, so `and status = 'paid'` must match nothing. This is
  // what stops a double click shipping twice and an unpaid order being
  // marked sent by someone guessing an id.
  const rows = await sql`
    update orders
       set status = 'shipped', shipped_at = now(), tracking = ${"SMOKE-AWB-2"}
     where id = ${created.orderIds[0]} and status = 'paid'
     returning id`;
  assert(rows.length === 0, "an already-shipped order shipped again");

  const [row] = await sql`select tracking from orders where id = ${created.orderIds[0]}`;
  assert(row.tracking === "SMOKE-AWB-1", "the refused update changed the row anyway");
  return "unchanged, as it should be";
});

await step("the admin stock UPDATE sets a quantity", async () => {
  const { quantity, error } = parseQuantity(7);
  assert(!error, "parseQuantity refused 7");
  const [row] = await sql`
    update stock set quantity = ${quantity}, updated_at = now()
     where sku = ${buy.sku}
     returning sku, quantity`;
  assert(row, "no such sku");
  assert(row.quantity === 7, `quantity is ${row.quantity}`);
  return `${row.sku} set to ${row.quantity}`;
});

await step("the admin stock counts query runs", async () => {
  const [counts] = await sql`
    select count(*) filter (where quantity = 0)::int as out_of_stock,
           count(*) filter (where quantity > 0 and quantity <= 5)::int as low
      from stock`;
  return `${counts.out_of_stock} out of stock, ${counts.low} low`;
});

// ------------------------------------------------------------ the oversold path

console.log("\nOversold (deliberately forced)");

await step("a second order, stock pulled out from under it, lands at 'oversold'", async () => {
  // The rare end of a known trade-off: stock is not reserved between
  // checkout and capture, so two shoppers can pass the same check. Money has
  // been taken, so the order is flagged rather than failed and a human
  // decides. Never once executed.
  const rpSecond = `smoke_order_${stamp}_oversold`;

  const [order] = await sql`
    insert into orders (
      customer_id, razorpay_order_id, subtotal_paise, shipping_paise, total_paise,
      customer_name, customer_email, customer_phone,
      address_line1, address_city, address_state, address_postcode, notes
    ) values (
      ${created.customerId}, ${rpSecond},
      ${priced.subtotalPaise}, ${priced.shippingPaise}, ${priced.totalPaise},
      ${"Smoke Test"}, ${email}, ${"9876543210"},
      ${"1 Test Lane"}, ${"Pune"}, ${"Maharashtra"}, ${"411001"},
      ${"smoke test — safe to delete"}
    ) returning id`;
  created.orderIds.push(order.id);

  await sql`
    insert into order_items (order_id, sku, product_id, name, size, qty, unit_price_paise, line_paise)
    values (${order.id}, ${buy.sku}, ${buy.productId}, ${buy.name}, ${buy.size},
            ${5}, ${buy.pricePaise}, ${buy.pricePaise * 5})`;

  // Fewer on the shelf than the order needs.
  await sql`update stock set quantity = ${1} where sku = ${buy.sku}`;

  const result = await markPaid(sql, {
    order_id: rpSecond, id: `smoke_pay_${stamp}_oversold`, amount: priced.totalPaise,
  });
  assert(result.settled, "markPaid did not pick the order up at all");
  assert(result.oversold, "markPaid did not notice it could not fulfil the order");

  const [row] = await sql`select status from orders where id = ${order.id}`;
  assert(row.status === "oversold", `status is ${row.status}, expected oversold`);

  // And critically: it must not have driven stock negative or thrown.
  const [stock] = await sql`select quantity from stock where sku = ${buy.sku}`;
  assert(stock.quantity === 1, `stock is ${stock.quantity}, expected the untouched 1`);
  return "flagged for a refund decision, stock left alone";
});

await step("markFailed gives up on an unpaid order", async () => {
  const rpThird = `smoke_order_${stamp}_failed`;
  const [order] = await sql`
    insert into orders (
      customer_id, razorpay_order_id, subtotal_paise, shipping_paise, total_paise,
      customer_name, customer_email, customer_phone,
      address_line1, address_city, address_state, address_postcode
    ) values (
      ${created.customerId}, ${rpThird}, ${1000}, ${0}, ${1000},
      ${"Smoke Test"}, ${email}, ${"9876543210"},
      ${"1 Test Lane"}, ${"Pune"}, ${"Maharashtra"}, ${"411001"}
    ) returning id`;
  created.orderIds.push(order.id);

  assert((await markFailed(sql, { order_id: rpThird })).failed, "markFailed matched nothing");
  const [row] = await sql`select status from orders where id = ${order.id}`;
  assert(row.status === "failed", `status is ${row.status}`);

  // A second payment.failed for the same order must be a no-op.
  assert(!(await markFailed(sql, { order_id: rpThird })).failed, "markFailed ran twice");
  return "failed once, not twice";
});

await step("a webhook delivery is recorded, and a repeat is not duplicated", async () => {
  const eventId = `smoke_evt_${stamp}`;
  const payload = { event: "payment.captured", smoke: true };

  for (let i = 0; i < 2; i++) {
    await sql`
      insert into webhook_events (event_id, event_type, payload)
      values (${eventId}, ${"payment.captured"}, ${JSON.stringify(payload)})
      on conflict (event_id) do nothing`;
  }
  const [{ n }] = await sql`
    select count(*)::int as n from webhook_events where event_id = ${eventId}`;
  assert(n === 1, `two deliveries produced ${n} rows`);

  await sql`update webhook_events set processed_at = now() where event_id = ${eventId}`;
  const [row] = await sql`select processed_at, payload from webhook_events where event_id = ${eventId}`;
  assert(row.processed_at, "processed_at was not set");
  const parsed = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  assert(parsed.smoke === true, "the jsonb payload did not come back");

  await sql`delete from webhook_events where event_id = ${eventId}`;
  return "one row for two deliveries";
});

// ------------------------------------------------- messages and subscribers

console.log("\nMessages & subscribers");

await step("insert a contact message, flood guard included", async () => {
  const [{ recent }] = await sql`
    select count(*)::int as recent from messages
     where email = ${email} and created_at > now() - interval '1 hour'`;
  assert(recent === 0, "the flood-guard query counted messages we have not sent");

  const [row] = await sql`
    insert into messages (name, email, subject, body, customer_id)
    values (${"Smoke Test"}, ${email}, ${"smoke"}, ${"This is a smoke test message."}, ${created.customerId})
    returning id`;
  assert(row?.id, "the message insert returned no id");
  created.messageIds.push(row.id);
  return row.id;
});

await step("the admin messages list query runs", async () => {
  const messages = await sql`
    select id, name, email, subject, body, handled_at, created_at,
           customer_id is not null as from_account
      from messages
     order by handled_at nulls first, created_at desc
     limit 100`;
  assert(messages.some((m) => m.email === email), "our message is not in the list");

  const [counts] = await sql`
    select count(*) filter (where handled_at is null)::int as unhandled,
           (select count(*) from subscribers where unsubscribed_at is null)::int as subscribers
      from messages`;
  return `${counts.unhandled} unhandled, ${counts.subscribers} subscriber(s)`;
});

await step("mark a message handled, then un-handle it", async () => {
  // Both branches of the statement that used to send an object where a
  // timestamp belonged. The true branch answered 500; only the false one
  // ever worked.
  for (const handled of [true, false]) {
    const [row] = await sql`
      update messages
         set handled_at = case when ${handled}::boolean then now() else null end
       where id = ${created.messageIds[0]}
       returning id, handled_at`;
    assert(row, "no such message");
    assert(handled ? row.handled_at !== null : row.handled_at === null,
      `handled_at is ${row.handled_at} for handled=${handled}`);
  }
  return "both branches write a real value";
});

await step("subscribe, and get an unsubscribe token back", async () => {
  const { randomBytes } = await import("node:crypto");
  await sql`
    insert into subscribers (email, unsubscribe_token, source)
    values (${email}, ${randomBytes(24).toString("base64url")}, ${"smoke"})
    on conflict (email) do update set unsubscribed_at = null`;
  created.subscriber = email;

  const [row] = await sql`select unsubscribe_token, unsubscribed_at from subscribers where email = ${email}`;
  assert(row?.unsubscribe_token, "no unsubscribe token was stored");
  assert(row.unsubscribed_at === null, "a new subscriber is already unsubscribed");
  return `token of ${row.unsubscribe_token.length} chars`;
});

await step("re-subscribing un-does an unsubscribe and keeps one row", async () => {
  const { randomBytes } = await import("node:crypto");
  await sql`update subscribers set unsubscribed_at = now() where email = ${email}`;

  await sql`
    insert into subscribers (email, unsubscribe_token, source)
    values (${email}, ${randomBytes(24).toString("base64url")}, ${"smoke"})
    on conflict (email) do update set unsubscribed_at = null`;

  const rows = await sql`select unsubscribed_at from subscribers where email = ${email}`;
  assert(rows.length === 1, `re-subscribing produced ${rows.length} rows`);
  assert(rows[0].unsubscribed_at === null, "re-subscribing did not clear unsubscribed_at");
  return "one row, subscribed again";
});

warn("nothing consumes unsubscribe_token — /api/unsubscribe does not exist yet");

// ------------------------------------------------------------------ cleanup
//
// Runs whether the steps above passed or not, because every step catches its
// own failure. The only way past this is the process being killed, and then
// the marker in every row is what makes the leftovers findable.

console.log("\nCleanup");

await step("restore the stock quantities we changed", async () => {
  if (stockBefore.size === 0) return "nothing to restore";
  for (const [sku, quantity] of stockBefore) {
    await sql`update stock set quantity = ${quantity}, updated_at = now() where sku = ${sku}`;
  }
  return [...stockBefore].map(([s, q]) => `${s} back to ${q}`).join(", ");
});

await step("delete the rows we created", async () => {
  const removed = [];

  if (created.messageIds.length) {
    const rows = await sql`delete from messages where email = ${email} returning id`;
    removed.push(`${rows.length} message(s)`);
  }
  if (created.subscriber) {
    const rows = await sql`delete from subscribers where email = ${email} returning email`;
    removed.push(`${rows.length} subscriber(s)`);
  }
  if (created.orderIds.length) {
    // order_items go with them: `on delete cascade` on the foreign key.
    const rows = await sql`delete from orders where customer_email = ${email} returning id`;
    removed.push(`${rows.length} order(s) and their items`);
  }
  if (created.customerId) {
    // Sessions cascade from customers.
    const rows = await sql`delete from customers where email = ${email} returning id`;
    removed.push(`${rows.length} customer and its sessions`);
  }

  return removed.length ? removed.join(", ") : "nothing to remove";
});

await step("confirm nothing is left behind", async () => {
  const [row] = await sql`
    select (select count(*)::int from customers   where email = ${email}) as customers,
           (select count(*)::int from orders      where customer_email = ${email}) as orders,
           (select count(*)::int from messages    where email = ${email}) as messages,
           (select count(*)::int from subscribers where email = ${email}) as subscribers`;
  const left = Object.entries(row).filter(([, n]) => n > 0);
  assert(left.length === 0, `left behind: ${left.map(([k, n]) => `${n} ${k}`).join(", ")}`);

  // Anything from an earlier crashed run, which nothing above would catch.
  const [{ strays }] = await sql`
    select count(*)::int as strays from customers where email like 'smoke+%@example.invalid'`;
  if (strays) {
    warn(`${strays} account(s) from an earlier interrupted run — remove with:`);
    warn("  delete from customers where email like 'smoke+%@example.invalid';");
  }
  return "clean";
});

console.log(
  failures
    ? `\n${failures} step(s) FAILED. The database has been cleaned up regardless.\n`
    : "\nEvery database path ran and cleaned up after itself.\n",
);
process.exit(failures ? 1 : 0);
