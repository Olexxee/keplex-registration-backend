import test from "node:test";
import assert from "node:assert/strict";
import { calculateSouvenirPrice, findMatchingPriceTier, quantityRangesOverlap } from "./souvenir.pricing.js";

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

test("matches inclusive quantity boundaries and open-ended tiers", () => {
  const tiers = [
    { minQuantity: 1, maxQuantity: 49, unitPrice: "700.00" },
    { minQuantity: 50, maxQuantity: 99, unitPrice: "500.00" },
    { minQuantity: 100, maxQuantity: null, unitPrice: "400.00" },
  ];
  assert.equal(findMatchingPriceTier(tiers, 1), tiers[0]);
  assert.equal(findMatchingPriceTier(tiers, 49), tiers[0]);
  assert.equal(findMatchingPriceTier(tiers, 50), tiers[1]);
  assert.equal(findMatchingPriceTier(tiers, 99), tiers[1]);
  assert.equal(findMatchingPriceTier(tiers, 100), tiers[2]);
  assert.equal(findMatchingPriceTier(tiers, 100000), tiers[2]);
  assert.equal(findMatchingPriceTier(tiers, 100001), undefined);
});

test("does not match unpriced legacy tiers and detects inclusive overlaps", () => {
  const legacy = { minQuantity: 1, maxQuantity: 10, unitPrice: null };
  assert.equal(findMatchingPriceTier([legacy], 5), undefined);
  assert.equal(quantityRangesOverlap({ minQuantity: 1, maxQuantity: 10 }, { minQuantity: 10, maxQuantity: 20 }), true);
  assert.equal(quantityRangesOverlap({ minQuantity: 1, maxQuantity: 9 }, { minQuantity: 10, maxQuantity: 20 }), false);
  assert.equal(quantityRangesOverlap({ minQuantity: 20, maxQuantity: null }, { minQuantity: 1, maxQuantity: 19 }), false);
});
