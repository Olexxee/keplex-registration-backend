import { z } from "zod";

const optionalText = z.string().trim().max(5000).optional().nullable();
const hexColor = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a six-digit hex value, e.g. #722F37");

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(220).optional(),
  description: optionalText,
  bookingTerms: optionalText,
  productionLeadTimeDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  featured: z.boolean().optional().default(false),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});
export const updateProductSchema = createProductSchema.partial();

export const createColorOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  colorHex: hexColor,
  swatchImageUrl: z.string().url().optional().nullable(),
  swatchPublicId: z.string().trim().max(255).optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});
export const updateColorOptionSchema = createColorOptionSchema.partial();

export const setActiveSchema = z.object({ active: z.boolean() });

export const createPriceTierSchema = z.object({
  label: z.string().trim().min(1).max(120),
  minQuantity: z.coerce.number().int().min(1),
  maxQuantity: z.coerce.number().int().min(1).optional().nullable(),
  totalPrice: z.coerce.number().positive().max(9999999999.99),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("NGN"),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
}).refine((value) => value.maxQuantity == null || value.maxQuantity >= value.minQuantity, {
  message: "Maximum quantity must be greater than or equal to minimum quantity",
  path: ["maxQuantity"],
});
export const updatePriceTierSchema = createPriceTierSchema.partial().refine(
  (value) => value.maxQuantity == null || value.minQuantity == null || value.maxQuantity >= value.minQuantity,
  { message: "Maximum quantity must be greater than or equal to minimum quantity", path: ["maxQuantity"] },
);

export const createProductMediaSchema = z.object({
  url: z.string().url(),
  publicId: z.string().trim().min(1).max(255),
  altText: z.string().trim().max(300).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});
export const updateProductMediaSchema = createProductMediaSchema.partial();

export const idParamsSchema = z.object({ id: z.string().trim().min(1) });
export const slugParamsSchema = z.object({ slug: z.string().trim().min(1).max(220) });
export const colorIdParamsSchema = z.object({ colorId: z.string().trim().min(1) });
export const tierIdParamsSchema = z.object({ tierId: z.string().trim().min(1) });
export const mediaIdParamsSchema = z.object({ mediaId: z.string().trim().min(1) });

export const selectedColorOptionIdsSchema = z.array(z.string().trim().min(1))
  .min(1, "Select at least one colour")
  .max(3, "You can select a maximum of three colours")
  .refine((ids) => new Set(ids).size === ids.length, "Colours must be unique");
