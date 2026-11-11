import crypto from "node:crypto";
import slugify from "slugify";
import { BadRequestError, ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import * as workshopDb from "./workshop.db.js";
import { isWorkshopBookingTransitionAllowed } from "./workshop.lifecycle.js";

const makeSlug = (value) => slugify(value, { lower: true, strict: true, trim: true });

const uniqueSlug = async (value, currentId = null) => {
  const base = makeSlug(value);
  if (!base) throw new BadRequestError("Workshop title must contain letters or numbers");
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await workshopDb.findOfferingBySlug(candidate);
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
};

const publicOffering = (offering) => ({
  id: offering.id,
  title: offering.title,
  slug: offering.slug,
  workshopType: offering.workshopType,
  description: offering.description,
  bookingTerms: offering.bookingTerms,
  contactEmail: offering.contactEmail,
  contactWhatsApp: offering.contactWhatsApp,
  featured: offering.featured,
  participantTiers: offering.participantTiers ?? [],
});

export const getPublicOfferings = async () => (await workshopDb.listPublicOfferings()).map(publicOffering);

export const listAdminOfferings = () => workshopDb.listAdminOfferings();

export const createOffering = async (data) => {
  const slug = await uniqueSlug(data.slug || data.title);
  return workshopDb.createOffering({
    ...data,
    slug,
    bookingTerms: data.bookingTerms ?? null,
    contactEmail: data.contactEmail ?? null,
    contactWhatsApp: data.contactWhatsApp ?? null,
    active: false,
  });
};

export const updateOffering = async (id, data) => {
  const existing = await workshopDb.findOfferingById(id);
  if (!existing) throw new NotFoundError("Workshop offering not found");
  const update = { ...data };
  if (data.slug || (data.title && data.title !== existing.title)) {
    update.slug = await uniqueSlug(data.slug || data.title, id);
  }
  try {
    return await workshopDb.updateOffering(id, update);
  } catch (error) {
    if (error?.code === "P2002") throw new ConflictError("A workshop with this slug already exists");
    throw error;
  }
};

export const setOfferingActive = async (id, active) => {
  const offering = await workshopDb.findOfferingById(id);
  if (!offering) throw new NotFoundError("Workshop offering not found");
  if (active && !offering.participantTiers.some((tier) => tier.active)) {
    throw new ConflictError("Add at least one active participant price tier before publishing this workshop");
  }
  return workshopDb.setOfferingActive(id, active);
};

export const createParticipantTier = async (offeringId, data) => {
  const offering = await workshopDb.findOfferingById(offeringId);
  if (!offering) throw new NotFoundError("Workshop offering not found");
  try {
    return await workshopDb.createParticipantTier(offeringId, data);
  } catch (error) {
    if (error?.code === "P2002") throw new ConflictError("A price tier already exists for this participant count in this offering");
    throw error;
  }
};

export const updateParticipantTier = async (tierId, data) => {
  const tier = await workshopDb.findParticipantTierById(tierId);
  if (!tier) throw new NotFoundError("Workshop participant tier not found");
  try {
    return await workshopDb.updateParticipantTier(tierId, data);
  } catch (error) {
    if (error?.code === "P2002") throw new ConflictError("A price tier already exists for this participant count in this offering");
    throw error;
  }
};

export const setParticipantTierActive = async (tierId, active) => {
  const tier = await workshopDb.findParticipantTierById(tierId);
  if (!tier) throw new NotFoundError("Workshop participant tier not found");
  return workshopDb.setParticipantTierActive(tierId, active);
};

export const createGuestBooking = async (data) => {
  const offering = await workshopDb.findOfferingById(data.offeringId);
  if (!offering || !offering.active) throw new NotFoundError("Workshop offering is not available");
  const tier = offering.participantTiers.find((item) => item.id === data.participantTierId && item.active);
  if (!tier) throw new BadRequestError("Choose an active participant tier for this workshop");
  if (data.venueMode === "CLIENT_VENUE" && !data.venueAddress?.trim()) {
    throw new BadRequestError("A venue address is required for client-venue events");
  }
  if (data.venueMode === "KPX_VENUE" && !data.city?.trim()) {
    throw new BadRequestError("A city is required when requesting a KPX-arranged venue");
  }
  if (offering.workshopType === "CUSTOM_GROUP" && !data.customWorkshopDescription?.trim()) {
    throw new BadRequestError("Describe the custom group workshop you want");
  }

  const reference = `KPX-WKS-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const accessToken = crypto.randomBytes(32).toString("hex");
  const accessTokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
  const booking = await workshopDb.createBookingWithInitialHistory({publicReference: reference,
      accessTokenHash,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerWhatsApp: data.customerWhatsApp,
      offeringId: offering.id,
      participantTierId: tier.id,
      workshopTitleSnapshot: offering.title,
      workshopType: offering.workshopType,
      participantCount: tier.participantCount,
      priceSnapshot: tier.price,
      currency: tier.currency,
      eventDate: data.eventDate,
      venueMode: data.venueMode,
      venueAddress: data.venueAddress ?? null,
      city: data.city ?? null,
      customWorkshopDescription: data.customWorkshopDescription ?? null,
      customerNotes: data.customerNotes ?? null,
      status: "NEW",
  });
  const result = {
    publicReference: booking.publicReference,
    status: booking.status,
    workshopTitle: booking.workshopTitleSnapshot,
    participantCount: booking.participantCount,
    price: booking.priceSnapshot,
    currency: booking.currency,
    eventDate: booking.eventDate,
    contactEmail: offering.contactEmail,
    contactWhatsApp: offering.contactWhatsApp,
  };
  return {
    ...result,
    accessToken,
    accessUrlPath: `/api/workshops/bookings/access/${reference}/${accessToken}`,
  };
};

export const getGuestBooking = async ({ reference, token }) => {
  const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const booking = await workshopDb.findGuestBookingByCredentials(reference, accessTokenHash);
  if (!booking) throw new NotFoundError("Workshop booking not found");
  return {
    publicReference: booking.publicReference,
    status: booking.status,
    workshopTitle: booking.workshopTitleSnapshot,
    workshopType: booking.workshopType,
    participantCount: booking.participantCount,
    price: booking.priceSnapshot,
    currency: booking.currency,
    eventDate: booking.eventDate,
    venueMode: booking.venueMode,
    venueAddress: booking.venueAddress,
    city: booking.city,
    customWorkshopDescription: booking.customWorkshopDescription,
    customerNotes: booking.customerNotes,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    offering: booking.offering,
    participantTier: booking.participantTier,
    proposal: booking.proposalPrice == null ? null : {
      price: booking.proposalPrice,
      currency: booking.currency,
      details: booking.proposalDetails,
      expiresAt: booking.proposalExpiresAt,
      sentAt: booking.proposalSentAt,
      respondedAt: booking.proposalRespondedAt,
    },
    history: booking.history,
  };
};

export const listAdminBookings = async (query) => {
  const [items, total] = await Promise.all([
    workshopDb.listAdminBookings(query),
    workshopDb.countAdminBookings(query.status ? { status: query.status } : {}),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total } };
};

export const updateAdminBooking = async (id, data, actorAdminId) => {
  const booking = await workshopDb.findBookingById(id);
  if (!booking) throw new NotFoundError("Workshop booking not found");

  if (data.status && data.status !== booking.status
    && !isWorkshopBookingTransitionAllowed(booking.status, data.status)) {
    throw new ConflictError(`Workshop booking cannot move from ${booking.status} to ${data.status}`);
  }

  const statusChanged = Boolean(data.status && data.status !== booking.status);
  const dateChanged = Boolean(data.eventDate
    && new Date(data.eventDate).getTime() !== booking.eventDate.getTime());
  const proposalFieldsChanged = ["proposalPrice", "proposalDetails", "proposalExpiresAt"]
    .some((key) => Object.hasOwn(data, key));

  if (data.status === "PROPOSAL_SENT" && statusChanged) {
    if (data.proposalPrice == null || !data.proposalDetails?.trim() || !data.proposalExpiresAt) {
      throw new BadRequestError("A proposal requires a final price, proposal details, and an expiry date");
    }
    if (new Date(data.proposalExpiresAt) <= new Date()) {
      throw new BadRequestError("Proposal expiry must be in the future");
    }
  } else if (proposalFieldsChanged) {
    throw new BadRequestError("Proposal terms can only be set when sending a proposal");
  }
  if (data.customerMessage && !statusChanged && !dateChanged) {
    throw new BadRequestError("A customer message must accompany a status change or reschedule");
  }
  if (dateChanged && ["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(booking.status)) {
    throw new ConflictError("A workshop cannot be rescheduled after it has started or reached a terminal state");
  }
  if (dateChanged && new Date(data.eventDate) <= new Date()) {
    throw new BadRequestError("Choose a future event date when rescheduling");
  }

  const updated = await workshopDb.updateBookingWithHistoryAndNotifications({
    currentBooking: booking,
    data,
    actorAdminId,
    customerMessage: data.customerMessage,
  });
  if (updated) return updated;

  const latest = await workshopDb.findBookingById(id);
  if (!latest) throw new NotFoundError("Workshop booking not found");
  throw new ConflictError(`Workshop booking changed concurrently (current status: ${latest.status}); refresh before retrying`);
};


export const respondToGuestProposal = async ({ reference, token, decision }) => {
  const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const booking = await workshopDb.findGuestBookingForDecision(reference, accessTokenHash);
  if (!booking) throw new NotFoundError("Workshop booking not found");
  if (booking.status !== "PROPOSAL_SENT") {
    throw new ConflictError("This proposal is no longer awaiting a response");
  }
  if (!booking.proposalExpiresAt || booking.proposalExpiresAt <= new Date()) {
    throw new ConflictError("This proposal has expired. Contact KPX Academy for an updated proposal");
  }
  const updated = await workshopDb.recordGuestProposalDecision({ bookingId: booking.id, decision });
  if (!updated) throw new ConflictError("This proposal was already answered or has expired");
  return { publicReference: updated.publicReference, status: updated.status, proposalRespondedAt: updated.proposalRespondedAt };
};
