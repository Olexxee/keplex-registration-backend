import { prisma } from "../../config/prisma.js";

export const findTrainingProgram = (id, tx = prisma) =>
  tx.trainingProgram.findUnique({
    where: { id },
    select: { id: true, title: true, active: true },
  });

export const findRegistration = (trainingProgramId, email, tx = prisma) =>
  tx.registration.findFirst({
    where: {
      trainingProgramId,
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true, name: true, email: true, status: true },
  });

export const findExistingSubmission = (trainingProgramId, email, statuses, tx = prisma) =>
  tx.certificateSubmission.findFirst({
    where: {
      trainingProgramId,
      studentEmail: { equals: email, mode: "insensitive" },
      status: { in: statuses },
    },
    orderBy: { createdAt: "desc" },
  });

export const createSubmission = (data, tx = prisma) =>
  tx.certificateSubmission.create({
    data,
    include: {
      trainingProgram: { select: { id: true, title: true } },
      registration: { select: { id: true, status: true } },
    },
  });

export const listSubmissions = ({ status, search, page = 1, limit = 20 } = {}, tx = prisma) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: "insensitive" } },
      { studentEmail: { contains: search, mode: "insensitive" } },
      { trainingProgram: { title: { contains: search, mode: "insensitive" } } },
    ];
  }
  return tx.certificateSubmission.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      trainingProgram: { select: { id: true, title: true } },
      registration: { select: { id: true, status: true } },
      certificate: { select: { id: true, certificateNumber: true, status: true, emailSentAt: true } },
    },
  });
};

export const countSubmissions = ({ status, search } = {}, tx = prisma) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: "insensitive" } },
      { studentEmail: { contains: search, mode: "insensitive" } },
      { trainingProgram: { title: { contains: search, mode: "insensitive" } } },
    ];
  }
  return tx.certificateSubmission.count({ where });
};

export const findSubmissionById = (id, tx = prisma) =>
  tx.certificateSubmission.findUnique({
    where: { id },
    include: {
      trainingProgram: { select: { id: true, title: true } },
      registration: { select: { id: true, name: true, email: true, status: true } },
      certificate: true,
    },
  });

export const updateSubmission = (id, data, tx = prisma) =>
  tx.certificateSubmission.update({
    where: { id },
    data,
    include: {
      trainingProgram: { select: { id: true, title: true } },
      registration: { select: { id: true, status: true } },
      certificate: true,
    },
  });

export const findActiveCertificateForRecipient = (studentEmail, trainingProgramTitle, tx = prisma) =>
  tx.certificate.findFirst({
    where: {
      studentEmail: { equals: studentEmail, mode: "insensitive" },
      trainingProgramTitle: { equals: trainingProgramTitle, mode: "insensitive" },
      status: "ISSUED",
    },
  });

const certificateInclude = {
  trainingProgram: { select: { id: true, title: true } },
  submission: { select: { id: true, studentName: true, studentEmail: true } },
  emailOutbox: {
    where: { type: "CERTIFICATE_DELIVERY" },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { status: true, updatedAt: true, lastError: true },
  },
};

export const createCertificate = (data, tx = prisma) =>
  tx.certificate.create({
    data,
    include: {
      trainingProgram: { select: { id: true, title: true } },
      submission: { select: { id: true, status: true } },
    },
  });

export const createCertificateWithInitialDelivery = (data) =>
  prisma.$transaction(async (tx) => {
    const certificate = await tx.certificate.create({
      data,
      include: {
        trainingProgram: { select: { id: true, title: true } },
        submission: { select: { id: true, status: true } },
      },
    });
    const delivery = await tx.emailOutbox.create({
      data: {
        type: "CERTIFICATE_DELIVERY",
        dedupeKey: `certificate:${certificate.id}:issue`,
        certificateId: certificate.id,
        payload: { certificateId: certificate.id },
      },
      select: { id: true, status: true },
    });
    return { certificate, delivery };
  });

export const enqueueCertificateResend = async (id, idempotencyKey) =>
  prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`
      SELECT "id"
      FROM "Certificate"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
    if (!locked.length) return null;

    const certificate = await tx.certificate.findUnique({ where: { id } });
    if (!certificate || certificate.status !== "ISSUED") {
      return { certificate, delivery: null, created: false };
    }

    const dedupeKey = `certificate:${id}:resend:${idempotencyKey}`;
    const inserted = await tx.emailOutbox.createMany({
      data: [{
        type: "CERTIFICATE_DELIVERY",
        dedupeKey,
        certificateId: id,
        payload: { certificateId: id },
      }],
      skipDuplicates: true,
    });
    const delivery = await tx.emailOutbox.findUnique({ where: { dedupeKey } });
    if (inserted.count === 1) {
      await tx.certificate.update({
        where: { id },
        data: { lastEmailError: null },
      });
    }
    return { certificate, delivery, created: inserted.count === 1 };
  });

export const findCertificateById = (id, tx = prisma) =>
  tx.certificate.findUnique({
    where: { id },
    include: certificateInclude,
  });

export const updateCertificate = (id, data, tx = prisma) =>
  tx.certificate.update({ where: { id }, data });

export const listCertificates = ({ status, search, page = 1, limit = 20 } = {}, tx = prisma) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: "insensitive" } },
      { studentEmail: { contains: search, mode: "insensitive" } },
      { certificateNumber: { contains: search, mode: "insensitive" } },
      { trainingProgramTitle: { contains: search, mode: "insensitive" } },
    ];
  }
  return tx.certificate.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { issuedAt: "desc" },
    include: {
      emailOutbox: {
        where: { type: "CERTIFICATE_DELIVERY" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, updatedAt: true, lastError: true },
      },
    },
  });
};

export const countCertificates = ({ status, search } = {}, tx = prisma) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: "insensitive" } },
      { studentEmail: { contains: search, mode: "insensitive" } },
      { certificateNumber: { contains: search, mode: "insensitive" } },
      { trainingProgramTitle: { contains: search, mode: "insensitive" } },
    ];
  }
  return tx.certificate.count({ where });
};

export const findCertificateByNumber = (certificateNumber, tx = prisma) =>
  tx.certificate.findUnique({ where: { certificateNumber } });
