-- Sarvha order store.
--
-- Run once against a fresh Postgres database:
--   psql "$DATABASE_URL" -f db/schema.sql
--   node db/seed-stock.mjs
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
