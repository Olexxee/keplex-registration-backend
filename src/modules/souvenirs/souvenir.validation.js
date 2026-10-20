import { z } from "zod";

const optionalText = z.string().trim().max(5000).optional().nullable();
const hexColor = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Colour must be a six-digit hex value, e.g. #722F37");


const priceTierFields = z.object({
  label: z.string().trim().min(1).max(120),
  minQuantity: z.coerce.number().int().min(1),
  maxQuantity: z.coerce.number().int().min(1).optional().nullable(),
  totalPrice: z.coerce.number().positive().max(9999999999.99),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("NGN"),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});



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

export const createPriceTierSchema = priceTierFields.refine(
  (value) =>
    value.maxQuantity == null || value.maxQuantity >= value.minQuantity,
  {
    message:
      "Maximum quantity must be greater than or equal to minimum quantity",
    path: ["maxQuantity"],
  },
);

export const updatePriceTierSchema = priceTierFields
  .partial()
  .refine(
    (value) =>
      value.maxQuantity == null ||
      value.minQuantity == null ||
      value.maxQuantity >= value.minQuantity,
    {
      message:
        "Maximum quantity must be greater than or equal to minimum quantity",
      path: ["maxQuantity"],
    },
  );
export const updateColorOptionSchema = createColorOptionSchema.partial();

export const setActiveSchema = z.object({ active: z.boolean() });

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


const guestContact = {
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  customerWhatsApp: z.string().trim().min(7).max(30).regex(/^\+?[0-9 ()-]+$/, "Enter a valid WhatsApp number"),
};

export const createSouvenirOrderSchema = z.object({
  ...guestContact,
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(100000),
  colorOptionIds: z.preprocess((value) => {
    if (typeof value === "string") {
      try { return JSON.parse(value); } catch { return value.split(",").map((item) => item.trim()).filter(Boolean); }
    }
    return value;
  }, selectedColorOptionIdsSchema),
  customerNotes: z.string().trim().max(3000).optional().nullable(),
});

export const createSouvenirEnquirySchema = z.object({
  ...guestContact,
  productId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional().nullable()),
  requestedQuantity: z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number().int().min(1).max(100000).optional().nullable()),
  designDescription: z.string().trim().min(10).max(5000),
});

export const accessTokenParamsSchema = z.object({
  token: z.string().trim().min(32).max(256),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().trim().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["SUBMITTED", "AWAITING_PAYMENT", "IN_PRODUCTION", "READY", "FULFILLED", "CANCELLED", "REJECTED"]),
  adminNotes: z.string().trim().max(5000).optional().nullable(),
});

export const enquiryAdminUpdateSchema = z.object({
  status: z.enum(["NEW", "UNDER_REVIEW", "RESPONDED", "ACCEPTED", "DECLINED", "CLOSED"]).optional(),
  adminNotes: z.string().trim().max(5000).optional().nullable(),
  responseMessage: z.string().trim().min(1).max(5000).optional().nullable(),
});


export const quoteRouteParamsSchema = z.object({
  id: z.string().trim().min(1),
  quoteId: z.string().trim().min(1),
});

export const createSouvenirQuoteSchema = z.object({
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("NGN"),
  terms: z.string().trim().max(5000).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional().nullable(),
    quantity: z.coerce.number().int().min(1).max(100000),
    unitPrice: z.coerce.number().positive().max(9999999999.99),
    displayOrder: z.coerce.number().int().min(0).optional(),
  })).min(1).max(100),
});

export const souvenirQuoteResponseSchema = z.object({
  quoteId: z.string().trim().min(1),
  decision: z.enum(["ACCEPT", "DECLINE"]),
});
