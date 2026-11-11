import test from "node:test";
import assert from "node:assert/strict";
import { guestBookingAccessParamsSchema } from "./workshop.validation.js";

const validParams = {
  reference: "KPX-WKS-ABC123",
  token: "a".repeat(64),
};

test("accepts a public reference with a 256-bit hex access token", () => {
  assert.equal(guestBookingAccessParamsSchema.safeParse(validParams).success, true);
});

test("rejects a missing or short guest access token", () => {
  assert.equal(
    guestBookingAccessParamsSchema.safeParse({ ...validParams, token: "short" }).success,
    false,
  );
});

test("rejects malformed guest access tokens", () => {
  assert.equal(
    guestBookingAccessParamsSchema.safeParse({ ...validParams, token: "z".repeat(64) }).success,
    false,
  );
});

test("requires the booking public reference with the token", () => {
  assert.equal(
    guestBookingAccessParamsSchema.safeParse({ token: validParams.token }).success,
    false,
  );
});
