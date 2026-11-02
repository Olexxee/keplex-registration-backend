import test from "node:test";
import assert from "node:assert/strict";
import { createSouvenirOrderSchema } from "./souvenir.validation.js";

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
