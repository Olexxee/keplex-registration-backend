import test from "node:test";
import assert from "node:assert/strict";
import { calculateSouvenirPrice } from "./souvenir.pricing.js";

test("calculates total from the unit rate for the matching volume tier", () => {
  assert.deepEqual(calculateSouvenirPrice("700.00", 20), {
    unitPriceSnapshot: "700.00",
    totalPriceSnapshot: "14000.00",
  });
  assert.deepEqual(calculateSouvenirPrice("500.50", 50), {
    unitPriceSnapshot: "500.50",
    totalPriceSnapshot: "25025.00",
  });
});

test("rejects invalid quantities and unit prices", () => {
  assert.throws(() => calculateSouvenirPrice("700", 0), /Quantity/);
  assert.throws(() => calculateSouvenirPrice("700", 100001), /Quantity/);
  assert.throws(() => calculateSouvenirPrice("0", 2), /greater than zero/);
  assert.throws(() => calculateSouvenirPrice("1.234", 2), /two decimal places/);
});

test("rejects totals outside the database Decimal(12,2) range", () => {
  assert.throws(() => calculateSouvenirPrice("9999999999.99", 2), /exceeds/);
});
