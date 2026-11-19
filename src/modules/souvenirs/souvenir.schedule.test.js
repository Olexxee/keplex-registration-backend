import test from "node:test";
import assert from "node:assert/strict";
import { buildPricingBands, formatPriceBandLabel, isValidCurrentSchedule } from "./souvenir.schedule.js";

test("builds inclusive contiguous ranges from ordered band starting quantities", () => {
  const bands = buildPricingBands([
    { minQuantity: 20, unitPrice: "700" },
    { minQuantity: 51, unitPrice: "500.5" },
    { minQuantity: 101, unitPrice: "400.00" },
  ]);
  assert.deepEqual(bands.map(({ minQuantity, maxQuantity, label, unitPrice }) => ({
    minQuantity, maxQuantity, label, unitPrice,
  })), [
    { minQuantity: 20, maxQuantity: 50, label: "20–50", unitPrice: "700.00" },
    { minQuantity: 51, maxQuantity: 100, label: "51–100", unitPrice: "500.50" },
    { minQuantity: 101, maxQuantity: null, label: "101+", unitPrice: "400.00" },
  ]);
});

test("allows a one-band schedule with an open-ended range", () => {
  assert.deepEqual(buildPricingBands([{ minQuantity: 1, unitPrice: "1.25" }])[0].maxQuantity, null);
});

test("rejects empty, unsorted, duplicate, invalid and excessive schedules", () => {
  assert.throws(() => buildPricingBands([]), /between 1 and 50/);
  assert.throws(() => buildPricingBands([{ minQuantity: 1, unitPrice: "1" }, { minQuantity: 1, unitPrice: "2" }]), /strictly increasing/);
  assert.throws(() => buildPricingBands([{ minQuantity: 0, unitPrice: "1" }]), /minimum quantity/);
  assert.throws(() => buildPricingBands([{ minQuantity: 1, unitPrice: "0" }]), /greater than zero/);
  assert.throws(() => buildPricingBands([{ minQuantity: 1, unitPrice: "1.234" }]), /at most two decimal places/);
  assert.throws(() => buildPricingBands([{ minQuantity: 100001, unitPrice: "1" }]), /minimum quantity/);
});

test("generates labels from numeric boundaries", () => {
  assert.equal(formatPriceBandLabel({ minQuantity: 1, maxQuantity: 10 }), "1–10");
  assert.equal(formatPriceBandLabel({ minQuantity: 11, maxQuantity: null }), "11+");
});

test("validates versioned contiguous current schedules and rejects gaps or wrong versions", () => {
  const bands = [
    { minQuantity: 20, maxQuantity: 50, version: 2, isCurrent: true, currency: "NGN", unitPrice: "700.00" },
    { minQuantity: 51, maxQuantity: null, version: 2, isCurrent: true, currency: "NGN", unitPrice: "500.00" },
  ];
  assert.equal(isValidCurrentSchedule(bands, 2), true);
  assert.equal(isValidCurrentSchedule([{ ...bands[1], minQuantity: 52 }, bands[0]], 2), false);
  assert.equal(isValidCurrentSchedule([{ ...bands[0], version: 1 }, bands[1]], 2), false);
  assert.equal(isValidCurrentSchedule([{ ...bands[1], maxQuantity: 100 }, bands[0]], 2), false);
});
