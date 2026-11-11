import assert from "node:assert/strict";
import test from "node:test";
import { initializeWorkshopPaymentSchema } from "./payment.validation.js";
import { toMinorUnits } from "./payment.service.js";

test("workshop checkout requires a private reference and 32-byte hex token", () => {
  assert.equal(initializeWorkshopPaymentSchema.safeParse({
    reference: "KPX-WKS-ABC123",
    token: "a".repeat(64),
  }).success, true);
  assert.equal(initializeWorkshopPaymentSchema.safeParse({
    reference: "KPX-WKS-ABC123",
    token: "short",
  }).success, false);
  assert.equal(initializeWorkshopPaymentSchema.safeParse({
    reference: "KPX-WKS-ABC123",
    token: "a".repeat(64),
    amount: 100,
  }).success, false);
});

test("payment amounts convert decimal major units to exact Paystack minor units", () => {
  assert.equal(toMinorUnits("1250"), 125000);
  assert.equal(toMinorUnits("1250.5"), 125050);
  assert.equal(toMinorUnits("1250.55"), 125055);
});
