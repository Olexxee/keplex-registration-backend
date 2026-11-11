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
  where: { id },
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
export const createBookingHistory = (data, tx = prisma) => tx.workshopBookingHistory.create({ data });
export const findGuestBookingByCredentials = (publicReference, accessTokenHash, tx = prisma) =>
  tx.workshopBooking.findFirst({
    where: { publicReference, accessTokenHash },
    include: {
      offering: { select: { title: true, slug: true, contactEmail: true, contactWhatsApp: true } },
      participantTier: { select: { label: true, participantCount: true, price: true, currency: true } },
      history: {
        orderBy: { createdAt: "asc" },
        select: {
          action: true, previousStatus: true, newStatus: true,
          previousEventDate: true, newEventDate: true, customerMessage: true, createdAt: true,
        },
      },
    },
  });
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

const notificationForStatus = (status) => ({
  PROPOSAL_SENT: "PROPOSAL_SENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
}[status] ?? null);

export const updateBookingWithHistoryAndNotifications = async ({
  currentBooking, data, actorAdminId, customerMessage,
}) => prisma.$transaction(async (transaction) => {
  const statusChanged = Boolean(data.status && data.status !== currentBooking.status);
  const dateChanged = Boolean(data.eventDate && new Date(data.eventDate).getTime() !== currentBooking.eventDate.getTime());
  const updateData = {
    ...(statusChanged ? { status: data.status } : {}),
    ...(dateChanged ? { eventDate: data.eventDate } : {}),
    ...(Object.hasOwn(data, "adminNotes") ? { adminNotes: data.adminNotes } : {}),
  };

  if (Object.keys(updateData).length === 0) return currentBooking;

  const result = await transaction.workshopBooking.updateMany({
    where: { id: currentBooking.id, status: currentBooking.status, updatedAt: currentBooking.updatedAt },
    data: updateData,
  });
  if (result.count !== 1) return null;

  const updated = await transaction.workshopBooking.findUnique({
    where: { id: currentBooking.id },
    include: {
      offering: { select: { title: true, slug: true } },
      participantTier: true,
    },
  });

  if (statusChanged || dateChanged) {
    const history = await transaction.workshopBookingHistory.create({
      data: {
        bookingId: currentBooking.id,
        action: statusChanged && dateChanged ? "UPDATED" : statusChanged ? "STATUS_CHANGED" : "RESCHEDULED",
        previousStatus: currentBooking.status,
        newStatus: updated.status,
        previousEventDate: currentBooking.eventDate,
        newEventDate: updated.eventDate,
        customerMessage: customerMessage ?? null,
        actorAdminId,
      },
    });

    const notificationTypes = [
      ...(statusChanged && notificationForStatus(updated.status) ? [notificationForStatus(updated.status)] : []),
      ...(dateChanged ? ["RESCHEDULED"] : []),
    ];

    for (const notificationType of notificationTypes) {
      await transaction.emailOutbox.create({
        data: {
          type: "WORKSHOP_BOOKING_NOTIFICATION",
          dedupeKey: `workshop-booking:${currentBooking.id}:${history.id}:${notificationType}`,
          workshopBookingId: currentBooking.id,
          payload: {
            notificationType,
            name: updated.customerName,
            email: updated.customerEmail,
            publicReference: updated.publicReference,
            workshopTitle: updated.workshopTitleSnapshot,
            previousStatus: currentBooking.status,
            newStatus: updated.status,
            previousEventDate: currentBooking.eventDate.toISOString(),
            newEventDate: updated.eventDate.toISOString(),
            customerMessage: customerMessage ?? null,
          },
        },
      });
    }
  }

  return updated;
});
