import { z } from "zod";

const statusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const createFaqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(1).max(10000),
  displayOrder: z.number().int().min(0).max(100000).optional(),
}).strict();

export const updateFaqSchema = z.object({
  question: z.string().trim().min(5).max(300).optional(),
  answer: z.string().trim().min(1).max(10000).optional(),
  status: statusSchema.optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one FAQ field must be supplied",
});
