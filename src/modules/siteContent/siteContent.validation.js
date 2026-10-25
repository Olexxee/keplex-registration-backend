import { z } from "zod";

const optionalUrl = z.string().trim().url().max(2000).nullable().optional();
const ctaUrl = z.string().trim().max(500).refine((value) => (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//i.test(value), "CTA URL must be a relative path or HTTP(S) URL").nullable().optional();
export const idParamsSchema = z.object({ id: z.string().trim().min(1) });
export const slugParamsSchema = z.object({ slug: z.string().trim().min(1) });
export const founderProfileSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  role: z.string().trim().min(2).max(120).optional(),
  mediaUrl: optionalUrl,
  mediaPublicId: z.string().trim().max(500).nullable().optional(),
  mediaAltText: z.string().trim().max(300).nullable().optional(),
});
export const heroSchema = z.object({
  eyebrow: z.string().trim().max(120).nullable().optional(),
  heading: z.string().trim().min(3).max(180),
  highlightText: z.string().trim().max(180).nullable().optional(),
  description: z.string().trim().min(10).max(1000),
  primaryCtaLabel: z.string().trim().max(80).nullable().optional(),
  primaryCtaUrl: ctaUrl,
  secondaryCtaLabel: z.string().trim().max(80).nullable().optional(),
  secondaryCtaUrl: ctaUrl,
  imageUrl: optionalUrl,
  imagePublicId: z.string().trim().max(500).nullable().optional(),
  imageAltText: z.string().trim().max(300).nullable().optional(),
});
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});
export const galleryImageSchema = z.object({
  categoryId: z.string().trim().min(1),
  url: z.string().url().max(2000),
  publicId: z.string().trim().min(1).max(500),
  altText: z.string().trim().min(3).max(300),
  caption: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
  featured: z.coerce.boolean().optional(),
});
export const resourceSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).nullable().optional(),
  fileUrl: z.string().url().max(2000),
  filePublicId: z.string().trim().min(1).max(500),
  fileBytes: z.coerce.number().int().positive().max(52428800),
  pageCount: z.coerce.number().int().positive().optional(),
  coverImageUrl: optionalUrl,
  coverImagePublicId: z.string().trim().max(500).nullable().optional(),
  trainingProgramId: z.string().trim().min(1).nullable().optional(),
});
export const statusSchema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) });
export const galleryQuerySchema = z.object({ category: z.string().trim().optional(), featured: z.coerce.boolean().optional() });
export const resourceQuerySchema = z.object({ search: z.string().trim().max(150).optional(), program: z.string().trim().optional() });

export const siteBrandingSchema = z.object({
  logoUrl: optionalUrl,
  logoPublicId: z.string().trim().max(500).nullable().optional(),
  logoAltText: z.string().trim().max(300).nullable().optional(),
});
