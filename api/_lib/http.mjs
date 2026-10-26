/** Request and response plumbing shared by the endpoints. */

export function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  // Never let a shop response be cached by a CDN; stock and orders are
  // per-request truths.
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function methodGuard(req, res, allowed) {
  if (req.method === allowed) return true;
  res.setHeader("allow", allowed);
  json(res, 405, { error: `Use ${allowed}.` });
  return false;
}

/**
 * The exact bytes of the request body.
 *
 * Needed for webhook signatures, which are computed over what was sent rather
 * than over anything we reconstruct from it.
 */
export function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Check the delivery details.
 *
 * Deliberately permissive about shape — addresses in India do not follow one —
 * and strict only where a wrong value means an order we cannot fulfil or a
 * customer we cannot reach.
 */
export function validateCustomer(input) {
  const errors = [];
  const name = str(input?.name);
  const email = str(input?.email).toLowerCase();
  const phone = str(input?.phone).replace(/[\s-]/g, "");
  const a = input?.address ?? {};
  const line1 = str(a.line1);
  const city = str(a.city);
  const state = str(a.state);
  const postcode = str(a.postcode).replace(/\s/g, "");

  if (name.length < 2) errors.push("Please give a name we can address the parcel to.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) errors.push("That email address doesn't look right.");
  // Indian mobile numbers are ten digits starting 6–9, with an optional +91.
  if (!/^(\+?91)?[6-9]\d{9}$/.test(phone)) errors.push("Please give a 10-digit Indian mobile number.");
  if (line1.length < 4) errors.push("Please give a street address.");
  if (city.length < 2) errors.push("Please give a city.");
  if (state.length < 2) errors.push("Please give a state.");
  if (!/^\d{6}$/.test(postcode)) errors.push("An Indian PIN code is six digits.");

  if (errors.length) return { errors };

  return {
    customer: {
      name, email,
      phone: phone.replace(/^\+?91/, ""),
      address: {
        line1,
        line2: str(a.line2) || null,
        city, state, postcode,
        country: "IN",
      },
      notes: str(input?.notes).slice(0, 500) || null,
    },
  };
}
