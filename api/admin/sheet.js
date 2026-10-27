/**
 * POST /api/admin/sheet
 *
 * Write every order into the Google Sheet, replacing what is there.
 *
 * Admin-only, like everything under /api/admin/. A stranger gets the same
 * 404 as for any other route here, because confirming this endpoint exists
 * tells them the sheet does.
 *
 * The columns are `ORDER_COLUMNS` from src/csv.mjs — the same ones the Excel
 * download uses. Two definitions of "what an order looks like in a
 * spreadsheet" would drift within a month, and then the sheet and the
 * download would disagree about your own orders.
 *
 * Returns what happened rather than ok: how many rows went in, or the
 * reason Google refused. The admin page shows that reason, because "sync
 * failed" with no cause means opening a log you do not have.
 */

import { json } from "../_lib/http.mjs";
import { requireAdmin } from "../_lib/admin.mjs";
import { listOrders } from "../_lib/order-list.mjs";
import { syncSheet, sheetStatus } from "../_lib/sheets.mjs";
import { ORDER_COLUMNS, ordersToRows } from "../../src/csv.mjs";

export default async function handler(req, res) {
  const gate = await requireAdmin(req, res);
  if (!gate) return;
  const { sql } = gate;

  if (req.method === "GET") {
    return json(res, 200, { sheet: sheetStatus() });
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "GET, POST");
    return json(res, 405, { error: "Use GET or POST." });
  }

  try {
    const status = sheetStatus();
    if (!status.configured) {
      return json(res, 400, {
        error: "Google Sheets isn't set up yet.",
        detail: status.reason,
        synced: false,
      });
    }

    // No limit: the whole point is a sheet that holds everything.
    const orders = await listOrders(sql, { limit: null });
    const result = await syncSheet(ORDER_COLUMNS, ordersToRows(orders));

    if (!result.synced) {
      console.error(`sheet sync failed: ${result.reason}`);
      return json(res, 502, {
        error: "That didn't reach the sheet.",
        detail: result.reason,
        synced: false,
      });
    }

    return json(res, 200, {
      ok: true,
      synced: true,
      rows: result.rows,
      tab: result.tab,
      url: result.url,
    });
  } catch (err) {
    console.error("sheet sync failed:", err);
    return json(res, 500, { error: "Something went wrong.", synced: false });
  }
}
