import { z } from "zod";

export const createRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254, "Email must not exceed 254 characters"),

  trainingProgramId: z.string().trim().min(1, "Training program is required"),
});

export const registrationIdSchema = z.object({
  id: z.string().trim().min(1, "Registration ID is required"),
});

export const registrationReferenceSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, "Payment reference is required")
    .max(100, "Invalid payment reference"),
});

export const listRegistrationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  status: z.enum(["PENDING", "PAID", "CANCELLED", "EXPIRED"]).optional(),

  trainingProgramId: z.string().trim().min(1).optional(),

  email: z.string().trim().email().optional(),
});
