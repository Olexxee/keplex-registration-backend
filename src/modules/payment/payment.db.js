import { prisma } from "../../config/prisma.js";

export const findTrainingProgram = (id, tx = prisma) =>
  tx.trainingProgram.findUnique({
    where: { id },
  });

export const countPaidRegistrations = (trainingProgramId, tx = prisma) =>
  tx.registration.count({
    where: {
      trainingProgramId,
      status: "PAID",
    },
  });

export const findRegistrationByProgramAndEmail = (
  trainingProgramId,
  email,
  tx = prisma,
) =>
  tx.registration.findUnique({
    where: {
      trainingProgramId_email: {
        trainingProgramId,
        email,
      },
    },
  });

export const createRegistration = (data, tx = prisma) =>
  tx.registration.create({ data });

export const updateRegistration = (id, data, tx = prisma) =>
  tx.registration.update({
    where: { id },
    data,
  });

export const createPayment = (data, tx = prisma) => tx.payment.create({ data });

export const findPendingWorkshopPayment = (workshopBookingId, tx = prisma) => tx.payment.findFirst({
  where: { workshopBookingId, status: "PENDING" },
  orderBy: { createdAt: "desc" },
});

export const findLatestWorkshopPayment = (workshopBookingId, tx = prisma) => tx.payment.findFirst({
  where: { workshopBookingId },
  orderBy: { createdAt: "desc" },
});

export const findGuestWorkshopBookingForPayment = (publicReference, accessTokenHash, tx = prisma) =>
  tx.workshopBooking.findFirst({
    where: { publicReference, OR: [
      { accessTokenHash },
      { guestAccessSessions: { some: { tokenHash: accessTokenHash, expiresAt: { gt: new Date() }, revokedAt: null } } },
    ] },
    select: {
      id: true,
      publicReference: true,
      customerName: true,
      customerEmail: true,
      status: true,
      proposalPrice: true,
      currency: true,
    },
  });

export const findPendingSouvenirPayment = (souvenirOrderId, tx = prisma) => tx.payment.findFirst({
  where: { souvenirOrderId, status: "PENDING" },
  orderBy: { createdAt: "desc" },
});

export const updatePayment = (id, data, tx = prisma) =>
  tx.payment.update({
    where: { id },
    data,
  });

export const findPaymentByReference = (reference, tx = prisma) =>
  tx.payment.findUnique({
    where: { reference },
    include: {
      registration: {
        include: {
          trainingProgram: true,
        },
      },
      souvenirOrder: true,
      workshopBooking: true,
    },
  });

export const findRegistrationPayments = (registrationId, tx = prisma) =>
  tx.payment.findMany({
    where: { registrationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  });
