/**
 * SRV-LAVENDE-15ML — stable, readable, and unique per size.
 *
 * This lives on its own because three places have to agree on it: the product
 * schema in the build, the stock table in the database, and the order lines we
 * write at checkout. If they ever disagree, stock is decremented against a key
 * that no order references, and the error is silent.
 */
export const skuFor = (p, v) =>
  `SRV-${p.id.replace(/-/g, "").slice(0, 7).toUpperCase()}-${v.size.replace(/\s/g, "").toUpperCase()}`;
