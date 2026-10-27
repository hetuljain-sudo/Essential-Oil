/**
 * Orders as a spreadsheet.
 *
 * CSV rather than a real .xlsx: Excel opens it natively, Google Sheets opens
 * it, and it needs no library on either side. An .xlsx would mean a
 * dependency and a binary format, to produce a file that opens the same way.
 *
 * Two things here are not decoration.
 *
 * **The BOM.** Excel on Windows reads a CSV as the system codepage unless the
 * file starts with a UTF-8 byte order mark. Without it, ₹ becomes â‚¹ and an
 * Indian name with any accent is mangled. One invisible character is the
 * difference between a usable file and a support question.
 *
 * **Formula injection.** A cell whose text begins `=`, `+`, `-` or `@` is run
 * as a formula when the file is opened. Customer names and addresses are
 * typed by strangers, so `=HYPERLINK(...)` in a delivery address would
 * execute on your machine when you open your own orders. Those values are
 * prefixed with an apostrophe, which Excel strips on display and which stops
 * it being a formula.
 *
 * Money is written as plain numbers in rupees, not "₹778", so a column can be
 * summed without cleaning it first.
 */

/** Characters Excel and Sheets treat as the start of a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One field, safe to place in a CSV.
 *
 * Text is always quoted. Unquoted text is legal, but a name containing a
 * comma, a quote or a newline then breaks the row, and quoting all of it
 * costs two bytes per field and removes the whole class of problem. Numbers
 * are the exception, and the comment below says why.
 */
export function csvField(value) {
  if (value === null || value === undefined) return '""';

  // A number goes in bare. Quoted, it is a string that merely looks numeric,
  // and whether a spreadsheet converts it back depends on the application and
  // the locale — which is a poor thing to stake a Total column on. Bare, it is
  // unambiguously a number everywhere. Nothing else is written unquoted.
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  let text = String(value);
  if (FORMULA_START.test(text)) text = "'" + text;

  return '"' + text.replace(/"/g, '""') + '"';
}

/** Rows of values to CSV text. CRLF, because that is what Excel expects. */
export function toCsv(rows) {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

export const CSV_BOM = "﻿";

/** paise -> a number in rupees, for a cell that will be summed. */
const rupees = (paise) => Number(paise ?? 0) / 100;

/**
 * An ISO date, which sorts correctly in a spreadsheet.
 *
 * "27 Oct 2026" reads better and sorts as text, putting April before
 * January. A column of dates that cannot be sorted is worse than an ugly one.
 */
const isoDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export const ORDER_COLUMNS = [
  "Order ID", "Date", "Status", "Customer", "Phone", "Email",
  "Address", "City", "State", "PIN",
  "Items", "Subtotal", "Shipping", "Total", "Tracking", "Dispatched", "Notes",
];

/**
 * One row per order, with the items collapsed into a single cell.
 *
 * Deliberately not one row per item. This file is for packing parcels and
 * for the accounts — both of which think in orders — and an order split over
 * three rows is counted three times by anyone summing the Total column.
 */
export function ordersToRows(orders) {
  return orders.map((o) => {
    const items = (Array.isArray(o.items) ? o.items : [])
      .map((i) => `${i.qty}x ${i.name} ${i.size}`)
      .join("; ");

    return [
      o.id,
      isoDate(o.created_at),
      o.status,
      o.customer_name,
      o.customer_phone,
      o.customer_email,
      [o.address_line1, o.address_line2].filter(Boolean).join(", "),
      o.address_city,
      o.address_state,
      o.address_postcode,
      items,
      rupees(o.subtotal_paise),
      rupees(o.shipping_paise),
      rupees(o.total_paise),
      o.tracking ?? "",
      isoDate(o.shipped_at),
      o.notes ?? "",
    ];
  });
}

/** The whole file, BOM included, ready to download. */
export function ordersToCsv(orders) {
  return CSV_BOM + toCsv([ORDER_COLUMNS, ...ordersToRows(orders)]);
}

/** sarvha-orders-2026-10-27.csv */
export function ordersFilename(now = new Date()) {
  return `sarvha-orders-${now.toISOString().slice(0, 10)}.csv`;
}
