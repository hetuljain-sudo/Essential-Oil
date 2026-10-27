/**
 * GET  /api/admin/orders            recent orders, newest first
 *      ?all=1                        every order, for the export and the sync
 * POST /api/admin/orders  { id, action: "ship", tracking? }
 *                         { id, action: "thank" }
 *                         { action: "sync" }     write them all to the sheet
 *
 * The sync lives here rather than in its own file for a reason worth
 * recording: Vercel's Hobby plan caps how many Serverless Functions one
 * deployment may contain, and every file under api/ is one. A separate
 * api/admin/sheet.js took this project from twelve to thirteen and every
 * deploy was rejected until it was folded back in. Adding a file under api/
 * is not free; adding an action to an existing handler is.
 *
 * The working list: what has been paid for and not yet sent.
 *
 * Both actions report whether the customer was actually emailed, rather than
 * answering a bare ok. Until this existed, dispatch logged "no email sent" to
 * a console nobody reads while the page said the order was shipped — and the
 * point of adding email is to stop the site implying things that did not
 * happen.
 */

import { json } from "../_lib/http.mjs";
import { requireAdmin, parseTracking } from "../_lib/admin.mjs";
import { sendEmail, emailStatus } from "../_lib/email.mjs";
import { listOrders, countOrders } from "../_lib/order-list.mjs";
import { sheetStatus, syncSheet } from "../_lib/sheets.mjs";
import { ORDER_COLUMNS, ordersToRows } from "../../src/csv.mjs";
import { thankYouEmail, dispatchEmail } from "../../src/emails.mjs";

/** The order with its items, in the shape the email templates expect. */
async function orderFor(sql, id) {
  const [order] = await sql`
    select o.id, o.status, o.total_paise, o.tracking, o.thanked_at,
           o.customer_name, o.customer_email,
           coalesce(
             json_agg(json_build_object('name', i.name, 'size', i.size, 'qty', i.qty)
                      order by i.id) filter (where i.id is not null),
             '[]'
           ) as items
      from orders o
      left join order_items i on i.order_id = o.id
     where o.id = ${id}
     group by o.id`;

  if (!order) return null;
  // json_agg comes back parsed by this driver, but a string from some others.
  if (typeof order.items === "string") order.items = JSON.parse(order.items);
  return order;
}

export default async function handler(req, res) {
  const gate = await requireAdmin(req, res);
  if (!gate) return;
  const { sql } = gate;

  try {
    if (req.method === "GET") {
      // ?all=1 lifts the page limit. The export and the sheet sync need
      // every order: a spreadsheet that stops at the hundredth is wrong in
      // a way nobody notices until the accounts do not add up.
      const wantsAll = /(^|[?&])all=1(&|$)/.test(req.url ?? "");
      const orders = await listOrders(sql, { limit: wantsAll ? null : 100 });
      const total = await countOrders(sql);

      const [counts] = await sql`
        select count(*) filter (where status = 'paid')::int as to_ship,
               count(*) filter (where status = 'oversold')::int as oversold,
               coalesce(sum(total_paise) filter (where status in ('paid','shipped')), 0)::bigint as taken_paise
          from orders`;

      // The page needs to know whether a thank-you button can do anything
      // at all, so it can say why it is disabled rather than failing on
      // click.
      return json(res, 200, {
        orders,
        counts,
        // So the page can say "showing 100 of 240" rather than quietly
        // drawing a truncated list.
        total,
        showing: orders.length,
        email: emailStatus(),
        sheet: sheetStatus(),
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
      const { id, action } = body;

      /* ----------------------------------------------- sync the sheet */
      /* Before the id check: this one acts on every order, not one of them. */
      if (action === "sync") {
        const status = sheetStatus();
        if (!status.configured) {
          return json(res, 400, {
            error: "Google Sheets isn't set up yet.",
            detail: status.reason,
            synced: false,
          });
        }

        // No limit. The whole point is a sheet that holds everything.
        const all = await listOrders(sql, { limit: null });
        const result = await syncSheet(ORDER_COLUMNS, ordersToRows(all));

        if (!result.synced) {
          console.error(`sheet sync failed: ${result.reason}`);
          return json(res, 502, {
            error: "That didn't reach the sheet.",
            detail: result.reason,
            synced: false,
          });
        }

        return json(res, 200, {
          ok: true, synced: true, rows: result.rows, tab: result.tab, url: result.url,
        });
      }

      if (typeof id !== "string" || !id) return json(res, 400, { error: "Which order?" });
      if (action !== "ship" && action !== "thank") {
        return json(res, 400, { error: "Unknown action." });
      }

      /* ------------------------------------------------------- thank you */

      if (action === "thank") {
        const order = await orderFor(sql, id);
        if (!order) return json(res, 404, { error: "No such order." });

        const { subject, text } = thankYouEmail(order);
        const result = await sendEmail({
          to: order.customer_email,
          toName: order.customer_name,
          subject,
          text,
        });

        if (!result.sent) {
          // Say so plainly and change nothing. An order marked thanked
          // because a send failed is a customer who never hears from you and
          // a page that says they did.
          console.error(`thank-you for ${id} not sent: ${result.reason}`);
          return json(res, 502, {
            error: "That didn't send.",
            detail: result.reason,
            sent: false,
          });
        }

        await sql`update orders set thanked_at = now() where id = ${id}`;
        return json(res, 200, { ok: true, sent: true, to: order.customer_email });
      }

      /* ----------------------------------------------------------- ship */

      const { tracking, error } = parseTracking(body.tracking);
      if (error) return json(res, 400, { error });

      // Only a paid order can ship. Guarding in the statement means two
      // clicks cannot double-ship, and an unpaid order cannot be marked sent
      // by someone guessing an id.
      const [order] = await sql`
        update orders
           set status = 'shipped', shipped_at = now(), tracking = ${tracking}
         where id = ${id} and status = 'paid'
         returning id, customer_email`;

      if (!order) {
        return json(res, 409, { error: "That order isn't awaiting dispatch — reload the page." });
      }

      // Shipped either way: the parcel has gone, and an email that failed to
      // send does not un-dispatch it. What must not happen is the page
      // claiming the customer was told when they were not, so the result of
      // the send is returned and the page says which it was.
      let notified = { sent: false, reason: "email is not configured" };

      const full = await orderFor(sql, id);
      if (full) {
        const { subject, text } = dispatchEmail({ ...full, tracking });
        notified = await sendEmail({
          to: full.customer_email,
          toName: full.customer_name,
          subject,
          text,
        });
      }

      if (!notified.sent) {
        console.error(`order ${order.id} shipped but not emailed: ${notified.reason}`);
      }

      return json(res, 200, {
        ok: true,
        shipped: true,
        sent: notified.sent,
        detail: notified.sent ? undefined : notified.reason,
      });
    }

    res.setHeader("allow", "GET, POST");
    return json(res, 405, { error: "Use GET or POST." });
  } catch (err) {
    console.error("admin orders failed:", err);
    return json(res, 500, { error: "Something went wrong." });
  }
}
