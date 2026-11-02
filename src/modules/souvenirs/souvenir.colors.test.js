import test from "node:test";
import assert from "node:assert/strict";
import { SOUVENIR_COLOR_PALETTE, validateSelectedColors } from "./souvenir.colors.js";

test("accepts customer selections from the fixed souvenir palette", () => {
  assert.deepEqual(validateSelectedColors([
    { name: "Navy", colorHex: "#17324D" },
    { name: "Gold", colorHex: "#D4A85A" },
  ]), [
    { colorOptionId: null, nameSnapshot: "Navy", colorHexSnapshot: "#17324D", swatchImageUrlSnapshot: null },
    { colorOptionId: null, nameSnapshot: "Gold", colorHexSnapshot: "#D4A85A", swatchImageUrlSnapshot: null },
  ]);
});

test("normalizes hex casing but rejects values outside the fixed palette", () => {
  assert.equal(validateSelectedColors([{ name: "Navy", colorHex: "#17324d" }])[0].colorHexSnapshot, "#17324D");
  assert.throws(() => validateSelectedColors([{ name: "Custom", colorHex: "#123456" }]), /available customer palette/);
  assert.throws(() => validateSelectedColors([{ name: "Navy", colorHex: "#123456" }]), /available customer palette/);
});

test("requires one to five unique palette colours", () => {
  assert.throws(() => validateSelectedColors([]), /one and five/);
  assert.throws(() => validateSelectedColors(Array.from({ length: 6 }, () => ({ name: "Navy", colorHex: "#17324D" }))), /one and five/);
  assert.throws(() => validateSelectedColors([
    { name: "Navy", colorHex: "#17324D" },
    { name: "Navy", colorHex: "#17324D" },
  ]), /unique/);
});

test("exposes a palette with more options than the maximum order selection", () => {
  assert.ok(SOUVENIR_COLOR_PALETTE.size > 5);
});
