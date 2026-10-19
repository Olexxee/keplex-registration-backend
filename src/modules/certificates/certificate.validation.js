import { z } from "zod";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const nameSchema = z.string().trim().min(2).max(120);
const notesSchema = z.string().trim().max(2000).optional();

export const createSubmissionSchema = z.object({
  studentName: nameSchema,
  studentEmail: emailSchema,
  trainingProgramId: z.string().trim().min(1),
  notes: notesSchema,
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().trim().max(2000).optional(),
});

export const issueDirectCertificateSchema = z.object({
  studentName: nameSchema,
  studentEmail: emailSchema,
  trainingProgramTitle: z.string().trim().min(2).max(200),
  trainingProgramId: z.string().trim().min(1).optional(),
});

export const certificateIdSchema = z.object({
  id: z.string().trim().min(1),
});

export const certificateNumberParamsSchema = z.object({
  certificateNumber: z.string().trim().min(6).max(80).regex(/^[A-Za-z0-9-]+$/),
});

export const revokeCertificateSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const listCertificatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["ISSUED", "REVOKED"]).optional(),
});

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
