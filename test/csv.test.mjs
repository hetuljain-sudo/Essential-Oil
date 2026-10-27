/**
 * The orders export.
 *
 * Worth testing properly, because two of the things it does are invisible
 * when they work and damaging when they do not: the formula guard runs on
 * text a stranger typed into a delivery address, and the totals are what
 * someone will add up and believe.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  csvField, toCsv, ordersToRows, ordersToCsv, ordersFilename, ORDER_COLUMNS, CSV_BOM,
} from "../src/csv.mjs";

test("quotes every field", () => {
  assert.equal(csvField("plain"), '"plain"');
  assert.equal(csvField(42), '"42"');
});

test("survives commas, quotes and newlines in an address", () => {
  assert.equal(csvField("402, Brigade Gardenia"), '"402, Brigade Gardenia"');
  assert.equal(csvField('He said "hello"'), '"He said ""hello"""');
  assert.equal(csvField("line one\nline two"), '"line one\nline two"');
});

test("empty and missing values become empty cells", () => {
  assert.equal(csvField(null), '""');
  assert.equal(csvField(undefined), '""');
  assert.equal(csvField(""), '""');
});

test("neutralises a formula hidden in customer text", () => {
  // The attack: someone types this as their name or address, you open your
  // own orders file, and Excel runs it.
  for (const payload of [
    "=HYPERLINK(\"http://evil\",\"click\")",
    "+1+1",
    "-1+1",
    "@SUM(A1:A9)",
    "\t=1+1",
  ]) {
    const out = csvField(payload);
    assert.ok(out.startsWith(`"'`), `${payload} was not neutralised: ${out}`);
  }
});

test("leaves ordinary text that merely contains those characters alone", () => {
  // Only the first character starts a formula. A hyphen mid-string is a
  // hyphen, and quoting every such address would be noise.
  assert.equal(csvField("Flat 2-B, Park Road"), '"Flat 2-B, Park Road"');
  assert.equal(csvField("a+b"), '"a+b"');
});

test("rows are CRLF separated, as Excel expects", () => {
  assert.equal(toCsv([["a", "b"], ["c", "d"]]), '"a","b"\r\n"c","d"');
});

const order = {
  id: "2f8beb3a-0000-4000-8000-000000000001",
  created_at: "2026-10-27T09:15:00.000Z",
  shipped_at: null,
  status: "paid",
  customer_name: "Ananya Iyer",
  customer_phone: "9845012345",
  customer_email: "ananya@example.invalid",
  address_line1: "402, Brigade Gardenia",
  address_line2: null,
  address_city: "Bengaluru",
  address_state: "Karnataka",
  address_postcode: "560034",
  subtotal_paise: 69900,
  shipping_paise: 7900,
  total_paise: 77800,
  tracking: null,
  notes: null,
  items: [{ name: "Lavender Fields", size: "15 ml", qty: 1 }],
};

test("an order becomes one row with the agreed columns", () => {
  const [row] = ordersToRows([order]);
  assert.equal(row.length, ORDER_COLUMNS.length);
  assert.equal(row[ORDER_COLUMNS.indexOf("Customer")], "Ananya Iyer");
  assert.equal(row[ORDER_COLUMNS.indexOf("City")], "Bengaluru");
  assert.equal(row[ORDER_COLUMNS.indexOf("Items")], "1x Lavender Fields 15 ml");
});

test("money is a number in rupees, so a column can be summed", () => {
  const [row] = ordersToRows([order]);
  const total = row[ORDER_COLUMNS.indexOf("Total")];
  assert.equal(total, 778);
  assert.equal(typeof total, "number");
  assert.equal(row[ORDER_COLUMNS.indexOf("Subtotal")], 699);
  assert.equal(row[ORDER_COLUMNS.indexOf("Shipping")], 79);
});

test("dates are ISO, so the column sorts", () => {
  const [row] = ordersToRows([order]);
  assert.equal(row[ORDER_COLUMNS.indexOf("Date")], "2026-10-27");
  assert.equal(row[ORDER_COLUMNS.indexOf("Dispatched")], "");
});

test("several items collapse into one cell", () => {
  const [row] = ordersToRows([{
    ...order,
    items: [
      { name: "Lavender Fields", size: "30 ml", qty: 1 },
      { name: "Sweet Orange Sunrise", size: "15 ml", qty: 2 },
    ],
  }]);
  assert.equal(
    row[ORDER_COLUMNS.indexOf("Items")],
    "1x Lavender Fields 30 ml; 2x Sweet Orange Sunrise 15 ml",
  );
});

test("an order with no items does not break the row", () => {
  const [row] = ordersToRows([{ ...order, items: [] }]);
  assert.equal(row[ORDER_COLUMNS.indexOf("Items")], "");
  assert.equal(row.length, ORDER_COLUMNS.length);
});

test("the file starts with a BOM and a header row", () => {
  const csv = ordersToCsv([order]);
  assert.ok(csv.startsWith(CSV_BOM), "no BOM — Excel will mangle ₹ and accents");
  const header = csv.slice(CSV_BOM.length).split("\r\n")[0];
  assert.equal(header, ORDER_COLUMNS.map((c) => `"${c}"`).join(","));
});

test("an empty list still produces a usable file", () => {
  const csv = ordersToCsv([]);
  assert.equal(csv.slice(CSV_BOM.length).split("\r\n").length, 1);
});

test("the filename carries the date", () => {
  assert.equal(ordersFilename(new Date("2026-10-27T00:00:00Z")), "sarvha-orders-2026-10-27.csv");
});
