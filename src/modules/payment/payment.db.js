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
