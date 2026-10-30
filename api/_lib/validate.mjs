/**
 * Pure input checks, with no imports.
 *
 * These live apart from admin.mjs deliberately. admin.mjs reaches the
 * database, so importing it drags in @neondatabase/serverless, and a test
 * covering nothing but arithmetic then cannot run on a checkout with no
 * node_modules. Keeping the pure parts importable on their own is what lets
 * the tests stay free of the database.
 *
 * Nothing here touches a request, a connection or the clock.
 */

/** A quantity an admin typed. Must be a sane whole number of bottles. */
export function parseQuantity(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { error: "Quantity must be a whole number." };
  }
  if (value < 0) return { error: "Quantity cannot be negative." };
  // Not a real limit, a typo guard: 100000 is a slipped keystroke, not stock.
  if (value > 10000) return { error: "That looks like a typo — 10,000 is the most we'll accept." };
  return { quantity: value };
}

/** A tracking reference, or nothing. Stored as typed, trimmed. */
export function parseTracking(value) {
  if (value == null || value === "") return { tracking: null };
  if (typeof value !== "string") return { error: "Tracking must be text." };
  const tracking = value.trim();
  if (tracking.length > 120) return { error: "That tracking reference is too long." };
  return { tracking: tracking || null };
}

/**
 * The note an admin writes against an oversold order.
 *
 * Optional, because "dealt with" is sometimes the whole truth and forcing
 * prose produces "." Capped because this is a note, not a file.
 */
export function parseResolution(value) {
  if (value == null || value === "") return { note: null };
  if (typeof value !== "string") return { error: "That note must be text." };
  const note = value.trim();
  if (note.length > 500) return { error: "That note is too long — 500 characters at most." };
  return { note: note || null };
}
