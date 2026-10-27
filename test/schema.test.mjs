/**
 * What db/check.mjs will expect of a database.
 *
 * It reads that from db/schema.sql rather than a list in the script, so what
 * is worth testing is the reading. The last test here is the one that
 * matters: it checks the real schema.sql, so a table added without a matching
 * column check cannot slip past silently.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { schemaExpectations } from "../db/schema-read.mjs";

test("finds tables, with or without `if not exists`", () => {
  const { tables } = schemaExpectations(`
    create table if not exists stock (sku text primary key);
    create table orders (id uuid primary key);
    CREATE TABLE IF NOT EXISTS Sessions (token_hash text);
  `);
  assert.deepEqual(tables, ["stock", "orders", "sessions"]);
});

test("finds columns added by alter table", () => {
  const { columns } = schemaExpectations(`
    alter table orders add column if not exists shipped_at timestamptz;
    alter table customers add column is_admin boolean not null default false;
  `);
  assert.deepEqual(columns, [["orders", "shipped_at"], ["customers", "is_admin"]]);
});

test("ignores what is only mentioned in a comment", () => {
  // A comment describing a table we do not create must not become something
  // the database is then reported as missing.
  const { tables, columns } = schemaExpectations(`
    -- create table if not exists refunds (id uuid);
    -- alter table orders add column if not exists refunded_at timestamptz;
    create table stock (sku text);
  `);
  assert.deepEqual(tables, ["stock"]);
  assert.deepEqual(columns, []);
});

test("does not count the same thing twice", () => {
  const { tables, columns } = schemaExpectations(`
    create table if not exists stock (sku text);
    create table if not exists stock (sku text);
    alter table orders add column if not exists tracking text;
    alter table orders add column if not exists tracking text;
  `);
  assert.deepEqual(tables, ["stock"]);
  assert.deepEqual(columns, [["orders", "tracking"]]);
});

test("ignores alter table that is not adding a column", () => {
  const { columns } = schemaExpectations(`
    alter table orders drop constraint if exists orders_status_check;
    alter table orders add constraint orders_status_check check (status in ('paid'));
  `);
  assert.deepEqual(columns, []);
});

test("the real schema declares everything the application reads", async () => {
  const url = new URL("../db/schema.sql", import.meta.url);
  const { tables, columns } = schemaExpectations(await readFile(url, "utf8"));

  for (const t of [
    "stock", "orders", "order_items", "webhook_events",
    "customers", "sessions", "messages", "subscribers",
  ]) {
    assert.ok(tables.includes(t), `schema.sql no longer creates ${t}`);
  }

  // Added after the first schema, and each one is a statement an endpoint
  // runs: without them a database built from an older copy passes the table
  // check and then fails on a real request.
  const names = columns.map((c) => c.join("."));
  for (const c of [
    "orders.shipped_at", "orders.tracking", "orders.customer_id",
    "customers.is_admin",
    "customers.address_line1", "customers.address_line2", "customers.address_city",
    "customers.address_state", "customers.address_postcode",
  ]) {
    assert.ok(names.includes(c), `schema.sql no longer adds ${c}`);
  }
});
