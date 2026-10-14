import { prisma } from "../../config/prisma.js";

const publicOfferingInclude = {
  participantTiers: {
    where: { active: true },
    orderBy: [{ participantCount: "asc" }, { displayOrder: "asc" }],
    select: { id: true, label: true, participantCount: true, price: true, currency: true, displayOrder: true },
  },
};

export const findOfferingBySlug = (slug, tx = prisma) => tx.workshopOffering.findUnique({ where: { slug }, select: { id: true, slug: true } });

export const listAdminOfferings = (tx = prisma) => tx.workshopOffering.findMany({
  orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
  include: { participantTiers: { orderBy: [{ participantCount: "asc" }, { displayOrder: "asc" }] } },
});

export const listPublicOfferings = (tx = prisma) => tx.workshopOffering.findMany({
  where: { active: true },
  orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { title: "asc" }],
  include: publicOfferingInclude,
});

export const findOfferingById = (id, tx = prisma) => tx.workshopOffering.findUnique({
  where: { id },
  include: { participantTiers: { orderBy: [{ participantCount: "asc" }, { displayOrder: "asc" }] } },
});
export const createOffering = (data, tx = prisma) => tx.workshopOffering.create({
  data,
  include: { participantTiers: true },
});
export const updateOffering = (id, data, tx = prisma) => tx.workshopOffering.update({
  where: { id, },
  data,
  include: { participantTiers: { orderBy: [{ participantCount: "asc" }, { displayOrder: "asc" }] } },
});
export const setOfferingActive = (id, active, tx = prisma) => tx.workshopOffering.update({
  where: { id }, data: { active }, include: { participantTiers: true },
});
export const createParticipantTier = (offeringId, data, tx = prisma) => tx.workshopParticipantTier.create({
  data: { ...data, offeringId },
});
export const findParticipantTierById = (id, tx = prisma) => tx.workshopParticipantTier.findUnique({
  where: { id }, include: { offering: true },
});
export const updateParticipantTier = (id, data, tx = prisma) => tx.workshopParticipantTier.update({
  where: { id }, data,
});
export const setParticipantTierActive = (id, active, tx = prisma) => tx.workshopParticipantTier.update({
  where: { id }, data: { active },
});
export const createBooking = (data, tx = prisma) => tx.workshopBooking.create({ data });
export const listAdminBookings = ({ status, page = 1, limit = 20 } = {}, tx = prisma) =>
  tx.workshopBooking.findMany({
    where: status ? { status } : {},
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
    include: { offering: { select: { title: true, slug: true } }, participantTier: { select: { label: true, participantCount: true, price: true, currency: true } } },
  });
export const countAdminBookings = (where = {}, tx = prisma) => tx.workshopBooking.count({ where });
export const findBookingById = (id, tx = prisma) => tx.workshopBooking.findUnique({
  where: { id },
  include: { offering: { select: { title: true, slug: true, contactEmail: true, contactWhatsApp: true } }, participantTier: true },
});
export const updateBooking = (id, data, tx = prisma) => tx.workshopBooking.update({
  where: { id }, data,
  include: { offering: { select: { title: true, slug: true } }, participantTier: true },
});
