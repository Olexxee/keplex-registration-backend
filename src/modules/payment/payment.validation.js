import { z } from "zod";

export const initializePaymentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  trainingProgramId: z.string().trim().min(1),
});

export const paymentReferenceSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9.=-]+$/),
});
