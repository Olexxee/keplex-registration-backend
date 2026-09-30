import { prisma } from "../../config/prisma.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import * as registrationDb from "./registration.db.js";

const normalizeEmail = (email) => email.trim().toLowerCase();

const ensureProgramCanAcceptRegistration = (program) => {
  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  if (!program.active) {
    throw new BadRequestError(
      "This training program is not currently available for registration",
    );
  }

  if (
    program.registrationDeadline &&
    new Date() > new Date(program.registrationDeadline)
  ) {
    throw new BadRequestError(
      "Registration for this training program has closed",
    );
  }
};

const ensureCapacityAvailable = async (trainingProgramId, capacity, tx) => {
  if (capacity === null || capacity === undefined) {
    return;
  }

  const paidCount = await tx.registration.count({
    where: {
      trainingProgramId,
      status: "PAID",
    },
  });

  if (paidCount >= capacity) {
    throw new BadRequestError("This training program is already full");
  }
};

export const createRegistration = async ({
  name,
  email,
  trainingProgramId,
}) => {
  const normalizedName = name.trim();
  const normalizedEmail = normalizeEmail(email);

  return prisma.$transaction(async (tx) => {
    const program = await tx.trainingProgram.findUnique({
      where: {
        id: trainingProgramId,
      },
    });

    ensureProgramCanAcceptRegistration(program);

    const existing = await registrationDb.findRegistrationByProgramAndEmail(
      trainingProgramId,
      normalizedEmail,
      tx,
    );

    if (existing) {
      if (existing.status === "PAID") {
        throw new ConflictError(
          "You are already registered for this training program",
        );
      }

      if (existing.status === "PENDING") {
        return existing;
      }

      if (existing.status === "CANCELLED" || existing.status === "EXPIRED") {
        throw new ConflictError("This registration cannot be reused");
      }
    }

    await ensureCapacityAvailable(trainingProgramId, program.capacity, tx);

    return registrationDb.createRegistration(
      {
        name: normalizedName,
        email: normalizedEmail,
        trainingProgramId,
        status: "PENDING",
      },
      tx,
    );
  });
};

export const getRegistrationById = async (id) => {
  const registration = await registrationDb.findRegistrationById(id);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  return registration;
};

export const getRegistrationByPaymentReference = async (reference) => {
  const registration =
    await registrationDb.findRegistrationByPaymentReference(reference);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  return registration;
};

export const cancelRegistration = async (id) => {
  const registration = await registrationDb.findRegistrationById(id);

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  if (registration.status === "PAID") {
    throw new BadRequestError(
      "A paid registration cannot be cancelled through this endpoint",
    );
  }

  if (registration.status === "CANCELLED") {
    return registration;
  }

  return registrationDb.updateRegistration(id, {
    status: "CANCELLED",
  });
};

export const listRegistrations = async ({
  page = 1,
  limit = 20,
  status,
  trainingProgramId,
  email,
}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (trainingProgramId) {
    where.trainingProgramId = trainingProgramId;
  }

  if (email) {
    where.email = normalizeEmail(email);
  }

  const skip = (page - 1) * limit;

  const [registrations, total] = await Promise.all([
    registrationDb.findRegistrations({
      where,
      skip,
      take: limit,
    }),

    registrationDb.countRegistrations(where),
  ]);

  return {
    registrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const markRegistrationPaid = async (registrationId, tx = prisma) => {
  const registration = await registrationDb.findRegistrationById(
    registrationId,
    tx,
  );

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  if (registration.status === "CANCELLED") {
    throw new BadRequestError(
      "A cancelled registration cannot be marked as paid",
    );
  }

  if (registration.status === "PAID") {
    return registration;
  }

  return registrationDb.updateRegistration(
    registrationId,
    {
      status: "PAID",
    },
    tx,
  );
};

export const markRegistrationPending = async (registrationId, tx = prisma) => {
  const registration = await registrationDb.findRegistrationById(
    registrationId,
    tx,
  );

  if (!registration) {
    throw new NotFoundError("Registration not found");
  }

  if (registration.status === "CANCELLED") {
    throw new BadRequestError(
      "A cancelled registration cannot be moved back to pending",
    );
  }

  return registrationDb.updateRegistration(
    registrationId,
    {
      status: "PENDING",
    },
    tx,
  );
};