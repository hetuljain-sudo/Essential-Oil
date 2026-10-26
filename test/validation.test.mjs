/**
 * Delivery-detail validation.
 *
 * These decide whether an order can be fulfilled and whether the customer
 * can be reached. Too strict and a real address is refused; too loose and a
 * parcel goes nowhere.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { validateCustomer } from "../api/_lib/http.mjs";

const good = {
  name: "Hetul Jain",
  email: "hetul@example.com",
  phone: "9315413515",
  address: {
    line1: "B-13, Rana Pratap Bagh",
    line2: "Nr. GT Road Industrial Area",
    city: "New Delhi",
    state: "Delhi",
    postcode: "110007",
  },
};

const withPhone = (phone) => validateCustomer({ ...good, phone });
const withAddress = (patch) =>
  validateCustomer({ ...good, address: { ...good.address, ...patch } });

test("accepts an ordinary Indian address", () => {
  const { customer, errors } = validateCustomer(good);
  assert.equal(errors, undefined);
  assert.equal(customer.address.city, "New Delhi");
  assert.equal(customer.address.country, "IN");
});

test("normalises what it keeps", () => {
  const { customer } = validateCustomer({
    ...good,
    email: "  Hetul@Example.COM ",
    phone: "+91 93154-13515",
  });
  // Lowercased, so one person is not two accounts; +91 and separators
  // stripped, so the same number is stored one way.
  assert.equal(customer.email, "hetul@example.com");
  assert.equal(customer.phone, "9315413515");
});

test("accepts a mobile written the several ways people write it", () => {
  for (const phone of ["9315413515", "+919315413515", "919315413515", "93154 13515", "93154-13515"]) {
    assert.equal(withPhone(phone).errors, undefined, `${phone} should be accepted`);
  }
});

test("refuses numbers that cannot be an Indian mobile", () => {
  for (const phone of ["123", "5315413515", "93154135150", "931541351", "abcdefghij", ""]) {
    assert.ok(withPhone(phone).errors, `${phone} should have been refused`);
  }
});

test("requires a six-digit PIN code", () => {
  assert.equal(withAddress({ postcode: "110007" }).errors, undefined);
  assert.equal(withAddress({ postcode: "110 007" }).errors, undefined, "a space is fine");
  for (const postcode of ["11007", "1100071", "ABC123", ""]) {
    assert.ok(withAddress({ postcode }).errors, `${postcode} should have been refused`);
  }
});

test("a second address line stays optional", () => {
  const { customer, errors } = withAddress({ line2: "" });
  assert.equal(errors, undefined);
  assert.equal(customer.address.line2, null, "empty should be stored as null, not as ''");
});

test("refuses an address with nothing to deliver to", () => {
  assert.ok(withAddress({ line1: "" }).errors);
  assert.ok(withAddress({ city: "" }).errors);
  assert.ok(withAddress({ state: "" }).errors);
  assert.ok(validateCustomer({ ...good, address: undefined }).errors);
});

test("refuses an unusable email", () => {
  for (const email of ["", "nope", "no@", "@nope.com", "a b@c.com", "a@b"]) {
    assert.ok(validateCustomer({ ...good, email }).errors, `${email} should have been refused`);
  }
});

test("reports every problem, not only the first", () => {
  const { errors } = validateCustomer({ name: "", email: "nope", phone: "1", address: {} });
  assert.ok(errors.length > 1, "a form with several faults should say so once");
});

test("trims the note rather than refusing a long one", () => {
  const { customer } = validateCustomer({ ...good, notes: "x".repeat(900) });
  assert.equal(customer.notes.length, 500);
});
