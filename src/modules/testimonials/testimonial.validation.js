import { z } from "zod";

export const createTestimonialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  role: z
    .string()
    .trim()
    .max(100, "Role must not exceed 100 characters")
    .optional(),

  message: z
    .string()
    .trim()
    .min(10, "Testimonial must be at least 10 characters")
    .max(1000, "Testimonial must not exceed 1000 characters"),

  rating: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),

  imageUrl: z
    .string()
    .trim()
    .url("Image URL must be a valid URL")
    .max(2000, "Image URL is too long")
    .optional(),
});

export const testimonialIdSchema = z.object({
  id: z.string().trim().min(1, "Testimonial ID is required"),
});

export const updateTestimonialStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

export const listTestimonialsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().optional(),

  status: z.enum(["APPROVED", "REJECTED", "PENDING"]).optional(),
});
