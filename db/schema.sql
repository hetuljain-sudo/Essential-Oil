-- Sarvha order store.
--
-- Applied by `npm run db:setup`, which runs these statements through the same
-- driver the application uses so that psql need not be installed:
--   npm run db:setup
--   npm run seed
--   npm run db:check
--   npm run smoke      -- exercises these tables for real
--
-- Safe to re-run. Every statement here is `if not exists` or `add column if
-- not exists`, so applying it to a live database adds what is missing and
-- changes nothing else. db/check.mjs reads this file to decide what it ought
-- to find, so a table added here gets checked for without editing that
-- script.
--
-- Money is bigint paise everywhere. Never numeric, never float: a rupee
-- column invites rounding, and these numbers are charged to real cards.

create table if not exists stock (
  sku         text primary key,
  product_id  text not null,
  size        text not null,
  quantity    integer not null check (quantity >= 0),
  updated_at  timestamptz not null default now()
);

-- The last line of defence against overselling. Even if the application
-- logic is wrong, Postgres refuses to take a shelf below zero.

create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  -- Razorpay's id for the order we asked it to create. Unique so a retried
  -- checkout cannot produce two rows for one payment attempt.
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,

  status              text not null default 'created'
                        check (status in ('created', 'paid', 'failed', 'oversold')),

  subtotal_paise      bigint not null check (subtotal_paise >= 0),
  shipping_paise      bigint not null check (shipping_paise >= 0),
  total_paise         bigint not null check (total_paise > 0),
  currency            text   not null default 'INR',

  customer_name       text not null,
  customer_email      text not null,
  customer_phone      text not null,

  address_line1       text not null,
  address_line2       text,
  address_city        text not null,
  address_state       text not null,
  address_postcode    text not null,
  address_country     text not null default 'IN',

  notes               text,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_email_idx on orders (lower(customer_email));

create table if not exists order_items (
  id                bigserial primary key,
  order_id          uuid not null references orders (id) on delete cascade,
  sku               text not null,
  product_id        text not null,
  -- Name and size are copied, not joined. An order is a record of what was
  -- sold at the time; renaming an oil next year must not rewrite history.
  name              text not null,
  size              text not null,
  qty               integer not null check (qty > 0),
  unit_price_paise  bigint not null check (unit_price_paise >= 0),
  line_paise        bigint not null check (line_paise >= 0)
);

create index if not exists order_items_order_id_idx on order_items (order_id);

-- Raw webhook deliveries, kept whether or not we understood them. When a
-- payment and our records disagree, this is the only place that can say what
-- Razorpay actually told us and when.
create table if not exists webhook_events (
  id            bigserial primary key,
  event_id      text unique,
  event_type    text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

-- ---------------------------------------------------------------- accounts
--
-- Ordering requires an account; browsing and filling a cart do not. The gate
-- is in api/checkout.js, which refuses a request without a session, and the
-- cost is known and accepted: some first-time buyers leave rather than
-- register. What it buys is a customer record against every order, an order
-- history and one delivery address on file.

create table if not exists customers (
  id             uuid primary key default gen_random_uuid(),
  -- Stored already lowercased by the application. The unique index is on the
  -- plain column because two rows differing only in case would otherwise be
  -- two accounts for one person.
  email          text not null unique,
  -- scrypt$N$r$p$salt$hash. Never a password.
  password_hash  text not null,
  name           text not null,
  phone          text,

  -- Crude throttle against guessing. Locking is per-account, which does mean
  -- someone can lock a known email out for fifteen minutes by failing to log
  -- in as them; that is a worse trade at scale, and the right fix is
  -- per-IP limiting at the edge.
  failed_logins  integer not null default 0,
  locked_until   timestamptz,

  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table if not exists sessions (
  -- SHA-256 of the token the browser holds. The token itself is never stored,
  -- so a copy of this table cannot be used to sign in as anyone.
  token_hash   text primary key,
  customer_id  uuid not null references customers (id) on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);

create index if not exists sessions_customer_idx on sessions (customer_id);
create index if not exists sessions_expiry_idx on sessions (expires_at);

-- Nullable, though checkout now always sets it. Orders placed before the
-- login requirement existed have no customer, and a null there records that
-- truthfully rather than being a gap to backfill.
alter table orders add column if not exists customer_id uuid references customers (id) on delete set null;
create index if not exists orders_customer_idx on orders (customer_id);

-- ------------------------------------------------- messages & subscribers
--
-- Both of these were forms that told the visitor their message had been sent
-- while doing nothing at all.

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  body        text not null,
  -- Set when the sender was logged in. Null is an ordinary anonymous message.
  customer_id uuid references customers (id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists messages_created_idx on messages (created_at desc);
create index if not exists messages_unhandled_idx on messages (created_at desc) where handled_at is null;

create table if not exists subscribers (
  email          text primary key,
  -- Random, and in the unsubscribe link. One-click out without logging in,
  -- and not guessable from the address itself.
  unsubscribe_token text not null unique,
  confirmed_at   timestamptz,
  unsubscribed_at timestamptz,
  source         text,
  created_at     timestamptz not null default now()
);

create index if not exists subscribers_active_idx on subscribers (created_at desc)
  where unsubscribed_at is null;

-- One delivery address remembered per account, so a returning customer is not
-- retyping it. Checkout still takes whatever is typed; this only prefills.
alter table customers add column if not exists address_line1 text;
alter table customers add column if not exists address_line2 text;
alter table customers add column if not exists address_city text;
alter table customers add column if not exists address_state text;
alter table customers add column if not exists address_postcode text;

-- ------------------------------------------------------------------ admin
--
-- No separate admin accounts: a flag on an ordinary customer. One identity,
-- one login, one session mechanism to get right. Grant it with
-- `node db/make-admin.mjs you@example.com` — never through the web.

alter table customers add column if not exists is_admin boolean not null default false;

-- Shipping, so an order has somewhere to go after 'paid'.
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists tracking text;

-- When a thank-you was sent to the customer, so the admin page can say
-- whether one has gone and a second click does not send a second copy. Null
-- means none sent, which is the honest default for every order placed before
-- email existed.
alter table orders add column if not exists thanked_at timestamptz;

-- 'shipped' is new. A check constraint cannot be extended in place, so it is
-- replaced; dropping by name first keeps this re-runnable.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('created', 'paid', 'shipped', 'failed', 'oversold'));

create index if not exists orders_to_ship_idx on orders (paid_at)
  where status = 'paid';
