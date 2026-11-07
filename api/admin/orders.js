/**
 * GET  /api/admin/orders            recent orders, newest first
 *      ?all=1                        every order, for the export and the sync
 *      ?codes=1                      the discount codes instead
 * POST /api/admin/orders  { id, action: "ship", tracking? }
 *                         { id, action: "thank" }
 *                         { id, action: "resolve", note? }
 *                         { action: "sync" }     write them all to the sheet
 *                         { action: "code-create", code, kind, value, … }
 *                         { action: "code-retire" | "code-revive", code }
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
import { requireAdmin, parseTracking, parseResolution, adminFailed } from "../_lib/admin.mjs";
import { sendEmail, emailStatus } from "../_lib/email.mjs";
import { listOrders, countOrders } from "../_lib/order-list.mjs";
import { sheetStatus, syncSheet } from "../_lib/sheets.mjs";
import { ORDER_COLUMNS, ordersToRows } from "../../src/csv.mjs";
import { thankYouEmail, dispatchEmail } from "../../src/emails.mjs";
import { parseDefinition, readCode } from "../../src/discount.mjs";

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
      /* ?codes=1 answers with the discount codes instead of the orders.
         Another action on an existing handler rather than another file —
         see the note at the top of this one about the twelve-function cap. */
      if (/(^|[?&])codes=1(&|$)/.test(req.url ?? "")) {
        const codes = await sql`
          select code, kind, value, min_subtotal_paise, max_redemptions,
                 times_redeemed, expires_at, active, note, created_at
            from discount_codes
           order by active desc, created_at desc`;
        return json(res, 200, { codes });
      }

      const wantsAll = /(^|[?&])all=1(&|$)/.test(req.url ?? "");
      const orders = await listOrders(sql, { limit: wantsAll ? null : 100 });
      const total = await countOrders(sql);

      const [counts] = await sql`
        select count(*) filter (where status = 'paid')::int as to_ship,
               count(*) filter (where status = 'oversold' and resolved_at is null)::int as oversold,
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

      /* --------------------------------------------------- discount codes */
      /* Also before the id check: these act on a code, not on an order. */

      if (action === "code-create") {
        const { definition, errors } = parseDefinition(body);
        if (errors) return json(res, 400, { error: errors[0], errors });

        // `on conflict do nothing` rather than an upsert. Editing a live
        // code in place silently changes what it is worth to everyone
        // holding it, including people part-way through a checkout; the
        // honest move is to retire it and issue another.
        const [row] = await sql`
          insert into discount_codes
            (code, kind, value, min_subtotal_paise, max_redemptions, expires_at, note, created_by)
          values (${definition.code}, ${definition.kind}, ${definition.value},
                  ${definition.minSubtotalPaise}, ${definition.maxRedemptions},
                  ${definition.expiresAt}, ${body.note ?? null}, ${gate.admin.id})
          on conflict (code) do nothing
          returning code`;

        if (!row) return json(res, 409, { error: "That code already exists. Retire it first." });
        return json(res, 200, { ok: true, code: row.code });
      }

      if (action === "code-retire" || action === "code-revive") {
        const { code, error } = readCode(body.code);
        if (error) return json(res, 400, { error });

        const [row] = await sql`
          update discount_codes set active = ${action === "code-revive"}
           where code = ${code} returning code, active`;

        if (!row) return json(res, 404, { error: "No such code." });
        return json(res, 200, { ok: true, code: row.code, active: row.active });
      }

      if (typeof id !== "string" || !id) return json(res, 400, { error: "Which order?" });
      if (action !== "ship" && action !== "thank" && action !== "resolve") {
        return json(res, 400, { error: "Unknown action." });
      }

      /* ------------------------------------------------ oversold, dealt with */

      if (action === "resolve") {
        const { note, error } = parseResolution(body.note);
        if (error) return json(res, 400, { error });

        // Only an unresolved oversold order. Resolving anything else would
        // be recording a decision about a problem that never happened, and
        // a second click must not overwrite the first person's note.
        const [row] = await sql`
          update orders
             set resolved_at = now(), resolution = ${note}
           where id = ${id} and status = 'oversold' and resolved_at is null
           returning id`;

        if (!row) {
          return json(res, 409, {
            error: "That order isn't an unresolved oversold one — reload the page.",
          });
        }

        // Said out loud: the customer is not told anything by this. It
        // records what you decided, it does not carry it out.
        console.log(`order ${id} marked resolved; no refund issued and no email sent`);

        return json(res, 200, { ok: true, resolved: true });
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
    return adminFailed(res, err, "admin orders");
  }
}
