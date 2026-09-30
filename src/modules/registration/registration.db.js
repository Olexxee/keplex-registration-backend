import { prisma } from "../../config/prisma.js";

const registrationInclude = {
  trainingProgram: {
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      deliveryMode: true,
      location: true,
      startDate: true,
      endDate: true,
    },
  },

  payments: {
    select: {
      id: true,
      provider: true,
      reference: true,
      providerReference: true,
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
};

export const createRegistration = async (data, tx = prisma) => {
  return tx.registration.create({
    data,
    include: registrationInclude,
  });
};

export const findRegistrationById = async (id, tx = prisma) => {
  return tx.registration.findUnique({
    where: { id },
    include: registrationInclude,
  });
};

export const findRegistrationByProgramAndEmail = async (
  trainingProgramId,
  email,
  tx = prisma,
) => {
  return tx.registration.findUnique({
    where: {
      trainingProgramId_email: {
        trainingProgramId,
        email,
      },
    },
    include: registrationInclude,
  });
};

export const findRegistrationByPaymentReference = async (
  reference,
  tx = prisma,
) => {
  return tx.registration.findFirst({
    where: {
      payments: {
        some: {
          reference,
        },
      },
    },
    include: registrationInclude,
  });
};

export const updateRegistration = async (id, data, tx = prisma) => {
  return tx.registration.update({
    where: { id },
    data,
    include: registrationInclude,
  });
};

export const countRegistrations = async (where = {}, tx = prisma) => {
  return tx.registration.count({
    where,
  });
};

export const findRegistrations = async (
  { where = {}, skip = 0, take = 20 },
  tx = prisma,
) => {
  return tx.registration.findMany({
    where,
    skip,
    take,
    include: registrationInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};
