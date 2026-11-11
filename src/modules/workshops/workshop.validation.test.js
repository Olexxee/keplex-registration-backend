import test from "node:test";
import assert from "node:assert/strict";
import { guestBookingAccessParamsSchema, updateBookingSchema } from "./workshop.validation.js";

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

test("accepts valid status and schedule updates with a customer-facing message", () => {
  assert.equal(updateBookingSchema.safeParse({
    status: "CONFIRMED",
    customerMessage: "Your workshop is confirmed.",
  }).success, true);
  assert.equal(updateBookingSchema.safeParse({
    eventDate: "2026-12-01T10:00:00.000Z",
    customerMessage: "The event date has changed.",
  }).success, true);
});

test("rejects empty updates, customer-message-only updates, and unknown fields", () => {
  assert.equal(updateBookingSchema.safeParse({}).success, false);
  assert.equal(updateBookingSchema.safeParse({ customerMessage: "Hello" }).success, false);
  assert.equal(updateBookingSchema.safeParse({ status: "CONFIRMED", isAdmin: true }).success, false);
});

test("accepts private admin note-only updates", () => {
  assert.equal(updateBookingSchema.safeParse({ adminNotes: "Call the venue manager." }).success, true);
});

test("requires complete proposal terms when sending a proposal", () => {
  const valid = updateBookingSchema.safeParse({
    status: "PROPOSAL_SENT",
    proposalPrice: 125000,
    proposalDetails: "Two-day resin art workshop including materials and guided instruction.",
    proposalExpiresAt: "2026-12-01T10:00:00.000Z",
  });
  assert.equal(valid.success, true);
});

test("accepts DECLINED as a persisted booking status", () => {
  assert.equal(updateBookingSchema.safeParse({ status: "DECLINED" }).success, true);
});

test("rejects proposal prices that exceed the database decimal precision", () => {
  assert.equal(updateBookingSchema.safeParse({
    status: "PROPOSAL_SENT",
    proposalPrice: 10000000000,
    proposalDetails: "A detailed workshop proposal with materials and facilitation.",
    proposalExpiresAt: "2026-12-01T10:00:00.000Z",
  }).success, false);
});
