import { z } from "zod";

const optionalString = z.string().trim().optional().nullable();

const optionalDate = z.coerce.date().optional().nullable();

const contentArray = z.array(z.string().trim().min(1)).optional().nullable();

export const createTrainingProgramSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),

  slug: z.string().trim().max(200).optional().nullable(),

  shortDescription: optionalString,

  description: optionalString,

  price: z.coerce.number().positive("Price must be greater than zero"),

  currency: z.string().trim().length(3).default("NGN"),

  duration: optionalString,

  deliveryMode: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]).default("PHYSICAL"),

  location: optionalString,

  startDate: optionalDate,

  endDate: optionalDate,

  capacity: z.coerce.number().int().positive().optional().nullable(),

  registrationDeadline: optionalDate,

  featured: z.boolean().default(false),

  active: z.boolean().default(true),

  displayOrder: z.coerce.number().int().default(0),

  highlights: contentArray,

  curriculum: contentArray,

  requirements: contentArray,

  benefits: contentArray,
});

export const updateTrainingProgramSchema =
  createTrainingProgramSchema.partial();

export const trainingProgramIdSchema = z.object({
  id: z.string().min(1),
});

export const trainingProgramSlugSchema = z.object({
  slug: z.string().trim().min(1),
});
