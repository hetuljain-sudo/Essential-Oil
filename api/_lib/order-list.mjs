/**
 * Reading orders with their items.
 *
 * One query, used by the admin page, the Excel export and the Google Sheet
 * sync. They were drifting before this existed: the page asked for 100 rows
 * and the export reused whatever the page was holding, so the spreadsheet
 * would have quietly stopped including the oldest orders at order 101, with
 * nothing anywhere saying so.
 */

/**
 * Orders, with the work on top: anything oversold first, then paid and
 * waiting to go, then the rest newest-first.
 *
 * `limit` caps the result. Pass `null` for all of them — Postgres treats
 * `LIMIT NULL` as no limit at all, which is why this is one query rather
 * than two that could disagree about their columns.
 *
 * The admin page passes a limit, because it draws a card per order and
 * nobody scrolls two thousand of them. The export and the sync pass null,
 * because a spreadsheet silently missing its oldest orders is worse than a
 * slow one.
 */
export async function listOrders(sql, { limit = 100 } = {}) {
  const rows = await sql`
    select o.id, o.status, o.subtotal_paise, o.shipping_paise, o.total_paise,
           o.created_at, o.paid_at, o.shipped_at, o.tracking, o.thanked_at, o.notes,
           o.resolved_at, o.resolution,
           o.customer_name, o.customer_email, o.customer_phone,
           o.address_line1, o.address_line2, o.address_city,
           o.address_state, o.address_postcode,
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
       -- An oversold order needs a decision, so it leads — until someone
       -- records one, at which point it stops demanding attention and
       -- settles in with everything else.
       case
         when o.status = 'oversold' and o.resolved_at is null then 0
         when o.status = 'paid' then 1
         else 2
       end,
       o.created_at desc
     limit ${limit}::int`;

  // json_agg comes back parsed by this driver and as a string on some
  // others. Normalising here means no caller has to know which.
  return rows.map((row) => ({
    ...row,
    items: typeof row.items === "string" ? JSON.parse(row.items) : (row.items ?? []),
  }));
}

/** How many orders exist, so a limited page can say what it is not showing. */
export async function countOrders(sql) {
  const [row] = await sql`select count(*)::int as total from orders`;
  return row.total;
}
