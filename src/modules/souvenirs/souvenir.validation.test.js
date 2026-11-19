import test from "node:test";
import assert from "node:assert/strict";
import { createSouvenirOrderSchema, pricingScheduleSchema } from "./souvenir.validation.js";

const validOrder = {
  customerName: "Kepemi Ebiwonjumi",
  customerEmail: "keplex203@gmail.com",
  customerWhatsApp: "08101064798",
  productId: "cmvogad3r0002ii1gnvrfv2p2",
  quantity: 120,
  colorSelections: [{ name: "Magenta", colorHex: "#C2185B" }],
  customerNotes: "",
};

test("accepts a standard Nigerian WhatsApp number", () => {
  assert.equal(createSouvenirOrderSchema.safeParse(validOrder).success, true);
});

test("accepts an international WhatsApp number with a leading plus", () => {
  assert.equal(
    createSouvenirOrderSchema.safeParse({
      ...validOrder,
      customerWhatsApp: "+234 810 106 4798",
    }).success,
    true,
  );
});

test("rejects letters and punctuation outside the supported phone format", () => {
  assert.equal(
    createSouvenirOrderSchema.safeParse({
      ...validOrder,
      customerWhatsApp: "0810ABC4798",
    }).success,
    false,
  );
});

test("requires colorSelections rather than the removed colorOptionIds field", () => {
  const { colorSelections, ...orderWithoutSelections } = validOrder;
  assert.equal(
    createSouvenirOrderSchema.safeParse({
      ...orderWithoutSelections,
      colorOptionIds: ["legacy-id"],
    }).success,
    false,
  );
});


test("validates complete pricing schedule requests and normalizes unit prices", () => {
  const parsed = pricingScheduleSchema.safeParse({
    expectedVersion: 0,
    bands: [
      { minQuantity: 20, unitPrice: "700" },
      { minQuantity: 51, unitPrice: 500.5 },
    ],
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.bands[0].unitPrice, "700");
  assert.equal(parsed.data.bands[1].unitPrice, "500.5");
});

test("rejects invalid schedule price precision and empty schedules", () => {
  assert.equal(pricingScheduleSchema.safeParse({ expectedVersion: 0, bands: [] }).success, false);
  assert.equal(pricingScheduleSchema.safeParse({ expectedVersion: 0, bands: [{ minQuantity: 1, unitPrice: "2.345" }] }).success, false);
  assert.equal(pricingScheduleSchema.safeParse({ expectedVersion: 0, bands: [{ minQuantity: 1, unitPrice: "0" }] }).success, false);
});
