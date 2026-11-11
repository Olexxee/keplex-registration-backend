import test from "node:test";
import assert from "node:assert/strict";
import { WORKSHOP_BOOKING_TRANSITIONS, isWorkshopBookingTransitionAllowed } from "./workshop.lifecycle.js";

const allowed = [
  ["NEW", "UNDER_REVIEW"],
  ["NEW", "CANCELLED"],
  ["UNDER_REVIEW", "PROPOSAL_SENT"],
  ["UNDER_REVIEW", "ACCEPTED"],
  ["PROPOSAL_SENT", "ACCEPTED"],
  ["PROPOSAL_SENT", "DECLINED"],
  ["ACCEPTED", "CONFIRMED"],
  ["CONFIRMED", "IN_PROGRESS"],
  ["IN_PROGRESS", "COMPLETED"],
  ["CONFIRMED", "CANCELLED"],
];

for (const [current, next] of allowed) {
  test(`allows workshop booking transition ${current} -> ${next}`, () => {
    assert.equal(isWorkshopBookingTransitionAllowed(current, next), true);
  });
}

const rejected = [
  ["NEW", "CONFIRMED"],
  ["PROPOSAL_SENT", "IN_PROGRESS"],
  ["ACCEPTED", "COMPLETED"],
  ["IN_PROGRESS", "CONFIRMED"],
  ["COMPLETED", "CANCELLED"],
  ["DECLINED", "ACCEPTED"],
  ["CANCELLED", "CONFIRMED"],
];

for (const [current, next] of rejected) {
  test(`rejects workshop booking transition ${current} -> ${next}`, () => {
    assert.equal(isWorkshopBookingTransitionAllowed(current, next), false);
  });
}

test("same-status updates are idempotent", () => {
  assert.equal(isWorkshopBookingTransitionAllowed("CONFIRMED", "CONFIRMED"), true);
});

test("completed and cancelled bookings are terminal", () => {
  assert.deepEqual(WORKSHOP_BOOKING_TRANSITIONS.COMPLETED, []);
  assert.deepEqual(WORKSHOP_BOOKING_TRANSITIONS.DECLINED, []);
  assert.deepEqual(WORKSHOP_BOOKING_TRANSITIONS.CANCELLED, []);
});
