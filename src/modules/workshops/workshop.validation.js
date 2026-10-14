import { z } from "zod";

const workshopTypes = ["RESIN_ART", "LIP_CARE_FORMULATION", "CUSTOM_GROUP"] as const;
const venueModes = ["CLIENT_VENUE", "KPX_VENUE", "UNDECIDED"] as const;
const bookingStatuses = ["NEW", "UNDER_REVIEW", "PROPOSAL_SENT", "ACCEPTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const idParamsSchema = z.object({ id: z.string().trim().min(1) });
export const tierParamsSchema = z.object({ tierId: z.string().trim().min(1) });
export const offeringParamsSchema = z.object({ offeringId: z.string().trim().min(1) });
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(bookingStatuses).optional(),
});

export const createOfferingSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(200).optional(),
  workshopType: z.enum(workshopTypes),
  description: z.string().trim().min(10).max(5000),
  bookingTerms: z.string().trim().max(5000).optional().nullable(),
  contactEmail: z.string().trim().email().max(254).optional().nullable(),
  contactWhatsApp: z.string().trim().min(7).max(30).regex(/^\+?[0-9 ()-]+$/).optional().nullable(),
  featured: z.boolean().optional().default(false),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});
export const updateOfferingSchema = createOfferingSchema.partial();
export const setActiveSchema = z.object({ active: z.boolean() });

export const createParticipantTierSchema = z.object({
  label: z.string().trim().min(1).max(120),
  participantCount: z.coerce.number().int().min(1).max(1000),
  price: z.coerce.number().positive().max(9999999999.99),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("NGN"),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});
export const updateParticipantTierSchema = createParticipantTierSchema.partial();

export const createBookingSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  customerWhatsApp: z.string().trim().min(7).max(30).regex(/^\+?[0-9 ()-]+$/, "Enter a valid WhatsApp number"),
  offeringId: z.string().trim().min(1),
  participantTierId: z.string().trim().min(1),
  eventDate: z.coerce.date(),
  venueMode: z.enum(venueModes),
  venueAddress: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  customWorkshopDescription: z.string().trim().max(3000).optional().nullable(),
  customerNotes: z.string().trim().max(3000).optional().nullable(),
}).superRefine((value, context) => {
  if (value.eventDate <= new Date()) {
    context.addIssue({ code: "custom", path: ["eventDate"], message: "Choose a future event date" });
  }
  if (value.venueMode === "CLIENT_VENUE" && !value.venueAddress?.trim()) {
    context.addIssue({ code: "custom", path: ["venueAddress"], message: "Enter the address for your venue" });
  }
  if (value.venueMode === "KPX_VENUE" && !value.city?.trim()) {
    context.addIssue({ code: "custom", path: ["city"], message: "Enter the city where you need a KPX-arranged venue" });
  }
  if (value.offeringId && value.customWorkshopDescription === "") {
    context.addIssue({ code: "custom", path: ["customWorkshopDescription"], message: "Describe your custom workshop request" });
  }
});

export const updateBookingSchema = z.object({
  status: z.enum(bookingStatuses).optional(),
  adminNotes: z.string().trim().max(5000).optional().nullable(),
});
