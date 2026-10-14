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

export const createCertificate = (data, tx = prisma) =>
  tx.certificate.create({
    data,
    include: {
      trainingProgram: { select: { id: true, title: true } },
      submission: { select: { id: true, status: true } },
    },
  });

export const findCertificateById = (id, tx = prisma) =>
  tx.certificate.findUnique({
    where: { id },
    include: {
      trainingProgram: { select: { id: true, title: true } },
      submission: { select: { id: true, studentName: true, studentEmail: true } },
    },
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
