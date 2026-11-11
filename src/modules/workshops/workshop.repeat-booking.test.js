import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createGuestBooking, respondToGuestProposal } from "./workshop.service.js";

const futureDate = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const offering = {
  id: "offering-resin",
  title: "Resin Art & Crafts Workshop",
  workshopType: "RESIN_ART",
  active: true,
  contactEmail: "workshops@example.test",
  contactWhatsApp: "+2348000000000",
  participantTiers: [{
    id: "tier-ten",
    label: "10 participants",
    participantCount: 10,
    price: "150000",
    currency: "NGN",
    active: true,
  }],
};

const bookingInput = (eventDate) => ({
  customerName: "Ada Example",
  customerEmail: "ada@example.test",
  customerWhatsApp: "+2348012345678",
  offeringId: offering.id,
  participantTierId: "tier-ten",
  eventDate,
  venueMode: "UNDECIDED",
});

test("the same customer can book the same participant tier for separate event dates", async () => {
  const createdBookings = [];
  const db = {
    findOfferingById: async (id) => id === offering.id ? offering : null,
    createBookingWithInitialHistory: async (data) => {
      const booking = {
        id: `booking-${createdBookings.length + 1}`,
        ...data,
      };
      createdBookings.push(booking);
      return booking;
    },
  };

  const firstDate = futureDate(14);
  const secondDate = futureDate(28);
  const first = await createGuestBooking(bookingInput(firstDate), db);
  const second = await createGuestBooking(bookingInput(secondDate), db);

  assert.equal(createdBookings.length, 2);
  assert.notEqual(first.publicReference, second.publicReference);
  assert.notEqual(first.accessToken, second.accessToken);
  assert.equal(createdBookings[0].participantTierId, "tier-ten");
  assert.equal(createdBookings[1].participantTierId, "tier-ten");
  assert.equal(createdBookings[0].participantCount, 10);
  assert.equal(createdBookings[1].participantCount, 10);
  assert.equal(createdBookings[0].customerEmail, createdBookings[1].customerEmail);
  assert.equal(createdBookings[0].eventDate.getTime(), firstDate.getTime());
  assert.equal(createdBookings[1].eventDate.getTime(), secondDate.getTime());
  assert.equal(first.status, "NEW");
  assert.equal(second.status, "NEW");
});

test("proposal decisions are scoped to each booking, not the customer or participant tier", async () => {
  const tokenOne = "a".repeat(64);
  const tokenTwo = "b".repeat(64);
  const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
  const records = [
    {
      id: "booking-one",
      publicReference: "KPX-WKS-ONE123",
      accessTokenHash: hash(tokenOne),
      status: "PROPOSAL_SENT",
      proposalExpiresAt: futureDate(3),
      proposalRespondedAt: null,
    },
    {
      id: "booking-two",
      publicReference: "KPX-WKS-TWO123",
      accessTokenHash: hash(tokenTwo),
      status: "PROPOSAL_SENT",
      proposalExpiresAt: futureDate(3),
      proposalRespondedAt: null,
    },
  ];
  const db = {
    findGuestBookingForDecision: async (reference, accessTokenHash) =>
      records.find((item) => item.publicReference === reference && item.accessTokenHash === accessTokenHash) ?? null,
    recordGuestProposalDecision: async ({ bookingId, decision }) => {
      const booking = records.find((item) => item.id === bookingId);
      if (!booking || booking.status !== "PROPOSAL_SENT") return null;
      booking.status = decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      booking.proposalRespondedAt = new Date();
      return booking;
    },
  };

  const first = await respondToGuestProposal({
    reference: "KPX-WKS-ONE123",
    token: tokenOne,
    decision: "ACCEPT",
  }, db);

  assert.equal(first.status, "ACCEPTED");
  assert.equal(records[0].status, "ACCEPTED");
  assert.equal(records[1].status, "PROPOSAL_SENT");

  const second = await respondToGuestProposal({
    reference: "KPX-WKS-TWO123",
    token: tokenTwo,
    decision: "DECLINE",
  }, db);

  assert.equal(second.status, "DECLINED");
  assert.equal(records[0].status, "ACCEPTED");
  assert.equal(records[1].status, "DECLINED");
});
