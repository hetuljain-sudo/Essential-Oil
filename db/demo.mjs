/**
 * Fill the admin page with something to look at.
 *
 *   npm run demo          # put the demo data in
 *   npm run demo:clear    # take it all out again
 *
 * An empty admin page cannot be judged. This writes orders across every
 * status the page knows how to draw — waiting to ship, already dispatched,
 * flagged oversold, abandoned before payment — plus contact messages and a
 * few low stock levels, so the thing can be looked at while it is doing its
 * job rather than while it is empty.
 *
 * None of this is real and none of it pretends to be. Every address is
 * `@example.invalid`, a domain reserved by RFC 2606 so it can never receive
 * mail, every order carries a note saying so, and `npm run demo:clear`
 * removes the lot. Nothing here is a plausible-looking record that could be
 * mistaken for a customer later.
 *
 * It refuses to run against a live Razorpay configuration, and refuses to
 * touch a database that already holds real orders.
 */

import { db } from "../api/_lib/db.mjs";
import { catalogue } from "../api/_lib/pricing.mjs";
import { site } from "../src/data.mjs";

const MARKER = "@example.invalid";
const NOTE = "DEMO DATA — not a real order. Remove with: npm run demo:clear";

const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => console.log(`  warn  ${m}`);

if (!process.env.DATABASE_URL) {
  console.error("\nDATABASE_URL is not set.\n");
  process.exit(1);
}
if ((process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live")) {
  console.error("\nRAZORPAY_KEY_ID is a LIVE key. Refusing to write demo rows here.\n");
  process.exit(1);
}

const sql = db();
const remove = process.argv.includes("--remove");

/* ------------------------------------------------------------------ clear */

if (remove) {
  console.log("\nRemoving demo data");

  const o = await sql`delete from orders where customer_email like ${"%" + MARKER} returning id`;
  const m = await sql`delete from messages where email like ${"%" + MARKER} returning id`;
  const s = await sql`delete from subscribers where email like ${"%" + MARKER} returning email`;
  const c = await sql`delete from customers where email like ${"%" + MARKER} returning id`;

  ok(`${o.length} order(s) and their items`);
  ok(`${m.length} message(s)`);
  ok(`${s.length} subscriber(s)`);
  ok(`${c.length} customer(s) and their sessions`);

  // Stock is deliberately not restored: the quantities the demo set are
  // plain numbers, and guessing at what they were before would be worse than
  // leaving them. Re-seed from the catalogue if you want the originals back.
  warn("stock levels left as they are — `npm run seed -- --reset` restores catalogue quantities");
  console.log("\nGone.\n");
  process.exit(0);
}

/* ------------------------------------------------------------------- guard */

const [{ real }] = await sql`
  select count(*)::int as real from orders
   where customer_email not like ${"%" + MARKER}`;

if (real > 0) {
  console.error(
    `\nThis database holds ${real} order(s) that are not demo data.\n` +
    "Refusing to mix demo rows in with real ones.\n",
  );
  process.exit(1);
}

/* -------------------------------------------------------------- the people
 *
 * Ordinary Indian names and addresses, because an admin page full of "Test
 * User 1" tells you nothing about how real names and long addresses sit in
 * the layout — which is half of what this exists to show.
 */

const people = [
  { name: "Ananya Iyer", city: "Bengaluru", state: "Karnataka", pin: "560034",
    line1: "402, Brigade Gardenia, 7th Cross", phone: "9845012345" },
  { name: "Rohan Mehta", city: "Mumbai", state: "Maharashtra", pin: "400058",
    line1: "B-12, Shanti Nivas, Andheri West", phone: "9820034567" },
  { name: "Priya Nair", city: "Kochi", state: "Kerala", pin: "682016",
    line1: "Puthen House, Panampilly Nagar", phone: "9847056789" },
  { name: "Arjun Singh Rathore", city: "Jaipur", state: "Rajasthan", pin: "302015",
    line1: "C-89, Vaishali Nagar, Near Amrapali Circle", phone: "9829078901" },
  { name: "Meera Krishnan", city: "Chennai", state: "Tamil Nadu", pin: "600020",
    line1: "14/3, Second Main Road, Adyar", phone: "9840090123" },
  { name: "Siddharth Bose", city: "Kolkata", state: "West Bengal", pin: "700029",
    line1: "28A, Hindustan Park, Gariahat", phone: "9830012345" },
  { name: "Kavya Reddy", city: "Hyderabad", state: "Telangana", pin: "500034",
    line1: "Flat 701, Aparna Towers, Banjara Hills Road 12", phone: "9949034567" },
  { name: "Imran Qureshi", city: "Lucknow", state: "Uttar Pradesh", pin: "226010",
    line1: "7, Mahanagar Extension, Near Kapoorthala", phone: "9839056789" },
];

const emailFor = (p) =>
  "demo." + p.name.toLowerCase().split(" ")[0] + MARKER;

/* --------------------------------------------------------------- the carts
 *
 * Real SKUs at real prices. The shipping rule is applied rather than typed,
 * so the totals on the page add up the way a real one would.
 */

const skus = [...catalogue.values()];
const pick = (sku) => catalogue.get(sku) ?? skus[0];

const carts = [
  [["SRV-LAVENDE-15ML", 1]],
  [["SRV-LAVENDE-30ML", 1], ["SRV-SWEETOR-15ML", 2]],
  [["SRV-ROMANCH-10ML", 1]],
  [["SRV-CEDARWO-30ML", 2], ["SRV-LAVENDE-15ML", 1]],
  [["SRV-SWEETOR-15ML", 1]],
  [["SRV-CEDARWO-15ML", 3]],
  [["SRV-ROMANCH-10ML", 2], ["SRV-LAVENDE-30ML", 1]],
  [["SRV-LAVENDE-15ML", 2]],
];

/** Lines and totals for a cart, priced the way the shop prices one. */
function price(cart) {
  const lines = cart.map(([sku, qty]) => {
    const e = pick(sku);
    return {
      sku: e.sku, productId: e.productId, name: e.name, size: e.size, qty,
      unitPricePaise: e.pricePaise, linePaise: e.pricePaise * qty,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.linePaise, 0);
  const shipping = subtotal >= site.freeShippingAt * 100 ? 0 : site.shippingFlat * 100;
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

/* ---------------------------------------------------------------- the plan
 *
 * One of each thing the orders tab draws, so no state is left untested by
 * eye: the to-do list, the history, the problem, and the abandoned cart.
 *
 * daysAgo spreads them out, because a page where every order arrived in the
 * same second tells you nothing about how dates read.
 */

const plan = [
  { status: "oversold", daysAgo: 1 },
  { status: "paid", daysAgo: 0 },
  { status: "paid", daysAgo: 1 },
  { status: "paid", daysAgo: 2 },
  { status: "shipped", daysAgo: 5, tracking: "BLUEDART-4471829930" },
  { status: "shipped", daysAgo: 9, tracking: "DELHIVERY-882310455" },
  { status: "created", daysAgo: 0 },
  { status: "failed", daysAgo: 3 },
];

console.log("\nSeeding demo data");

let made = 0;

for (const [i, step] of plan.entries()) {
  const person = people[i];
  const cart = price(carts[i]);
  const email = emailFor(person);

  const [customer] = await sql`
    insert into customers (email, password_hash, name, phone,
                           address_line1, address_city, address_state, address_postcode)
    values (${email}, ${"demo-no-login"}, ${person.name}, ${person.phone},
            ${person.line1}, ${person.city}, ${person.state}, ${person.pin})
    on conflict (email) do update set name = excluded.name
    returning id`;

  // password_hash is deliberately not a valid scrypt hash. verifyPassword
  // returns false on anything malformed, so nobody can log in as a demo
  // customer — the rows exist to be looked at, not signed into.

  const paid = step.status === "paid" || step.status === "shipped" || step.status === "oversold";

  const [order] = await sql`
    insert into orders (
      customer_id, razorpay_order_id, razorpay_payment_id, status,
      subtotal_paise, shipping_paise, total_paise,
      customer_name, customer_email, customer_phone,
      address_line1, address_city, address_state, address_postcode,
      notes, created_at, paid_at, shipped_at, tracking
    ) values (
      ${customer.id},
      ${"order_DEMO" + String(i).padStart(2, "0") + Date.now().toString(36)},
      ${paid ? "pay_DEMO" + String(i).padStart(2, "0") + Date.now().toString(36) : null},
      ${step.status},
      ${cart.subtotal}, ${cart.shipping}, ${cart.total},
      ${person.name}, ${email}, ${person.phone},
      ${person.line1}, ${person.city}, ${person.state}, ${person.pin},
      ${NOTE},
      now() - (${step.daysAgo}::int * interval '1 day'),
      ${paid ? sqlDaysAgo(step.daysAgo) : null},
      ${step.tracking ? sqlDaysAgo(Math.max(0, step.daysAgo - 2)) : null},
      ${step.tracking ?? null}
    ) returning id`;

  for (const l of cart.lines) {
    await sql`
      insert into order_items (order_id, sku, product_id, name, size, qty, unit_price_paise, line_paise)
      values (${order.id}, ${l.sku}, ${l.productId}, ${l.name}, ${l.size},
              ${l.qty}, ${l.unitPricePaise}, ${l.linePaise})`;
  }
  made++;
}

/**
 * A timestamp N days ago, computed here rather than by Postgres.
 *
 * The surrounding insert needs a value or a null in one position, and a
 * nested sql`` template cannot be interpolated as a fragment — the driver
 * sends it as a bound value, which is the bug this project already fixed
 * twice. An ISO string is unambiguous and goes in as a plain parameter.
 */
function sqlDaysAgo(days) {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

ok(`${made} orders across ${new Set(plan.map((p) => p.status)).size} statuses`);

/* ------------------------------------------------------------- the inbox */

const messages = [
  { who: 0, subject: "Is the lavender steam distilled?",
    body: "Hello, I'd like to know whether the lavender is steam distilled and where it is grown. I'm particular about this for my practice. Thank you." },
  { who: 2, subject: "Wrong size delivered",
    body: "I ordered the 30 ml frankincense but received the 15 ml. Happy to send it back — please let me know the process." },
  { who: 4, subject: "Bulk order for a yoga studio",
    body: "We run a studio in Adyar with about 40 regular students and are looking for a standing monthly order of lavender and eucalyptus. Do you offer trade pricing?" },
  { who: 6, subject: "",
    body: "Do you ship to Hyderabad and how long does it usually take? Thinking of ordering before the weekend." },
];

for (const m of messages) {
  const person = people[m.who];
  await sql`
    insert into messages (name, email, subject, body, created_at, handled_at)
    values (${person.name}, ${emailFor(person)}, ${m.subject || null}, ${m.body},
            now() - (${m.who}::int * interval '1 day'),
            ${m.who === 0 ? sqlDaysAgo(0) : null})`;
}
ok(`${messages.length} contact messages, one already handled`);

for (const i of [1, 3, 5]) {
  await sql`
    insert into subscribers (email, unsubscribe_token, source)
    values (${emailFor(people[i])}, ${"demo-token-" + i + "-" + Date.now().toString(36)}, ${"footer"})
    on conflict (email) do nothing`;
}
ok("3 newsletter subscribers");

/* -------------------------------------------------------------- the shelf
 *
 * A sold-out line and a couple of low ones, so the stock tab shows the
 * states it has styling for rather than 78 identical healthy rows.
 */

const shelf = [["SRV-ROMANCH-10ML", 0], ["SRV-LAVENDE-15ML", 3], ["SRV-SWEETOR-15ML", 5]];
for (const [sku, quantity] of shelf) {
  await sql`update stock set quantity = ${quantity}, updated_at = now() where sku = ${sku}`;
}
ok(`${shelf.length} stock levels set low or to zero`);

console.log(`
Demo data is in. Open /admin/ to see it.

  Orders     1 oversold, 3 awaiting dispatch, 2 shipped, 1 unpaid, 1 failed
  Messages   4, one handled
  Stock      1 sold out, 2 low

Every row is marked ${MARKER} and comes out with: npm run demo:clear
`);
process.exit(0);
