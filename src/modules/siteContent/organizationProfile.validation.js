import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const optionalUrl = z.string().trim().url().max(500).nullable().optional();

export const organizationProfileSchema = z.object({
  organizationName: z.string().trim().min(2).max(160).optional(),
  tagline: optionalText(200),
  description: optionalText(1200),
  contactEmail: z.string().trim().email().max(254).nullable().optional(),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  address: optionalText(1000),
  operatingHours: optionalText(500),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  copyrightText: optionalText(300),
});
