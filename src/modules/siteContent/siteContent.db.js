import { prisma } from "../../config/prisma.js";

const founderProfileId = "founder-profile";
export const getFounderProfile = (tx = prisma) => tx.FounderProfile.findUnique({ where: { id: founderProfileId } });
export const upsertFounderProfile = (data, tx = prisma) => tx.FounderProfile.upsert({
  where: { id: founderProfileId },
  create: { id: founderProfileId, ...data },
  update: data,
});

export const findPublishedHero = (tx = prisma) => tx.HomepageHero.findFirst({ where: { status: "PUBLISHED" }, orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }] });
export const listPublishedHeroes = (tx = prisma) => tx.HomepageHero.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }] });
export const listHeroes = (tx = prisma) => tx.HomepageHero.findMany({ orderBy: { updatedAt: "desc" } });
export const findHero = (id, tx = prisma) => tx.HomepageHero.findUnique({ where: { id } });
export const createHero = (data, tx = prisma) => tx.HomepageHero.create({ data });
export const updateHero = (id, data, tx = prisma) => tx.HomepageHero.update({ where: { id }, data });
export const deleteHero = (id, tx = prisma) => tx.HomepageHero.delete({ where: { id } });
export const publishHero = async (id, tx = prisma) => {
  const current = await tx.HomepageHero.findUnique({ where: { id } });
  if (!current) return null;
  return tx.HomepageHero.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
};

export const listPublicCategories = (tx = prisma) => tx.GalleryCategory.findMany({
  where: { active: true, images: { some: { status: "PUBLISHED" } } },
  orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  include: { images: { where: { status: "PUBLISHED" }, orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }] } },
});
export const findCategory = (id, tx = prisma) => tx.GalleryCategory.findUnique({ where: { id }, include: { images: { select: { publicId: true } } } });
export const listCategories = (tx = prisma) => tx.GalleryCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }], include: { _count: { select: { images: true } } } });
export const createCategory = (data, tx = prisma) => tx.GalleryCategory.create({ data });
export const updateCategory = (id, data, tx = prisma) => tx.GalleryCategory.update({ where: { id }, data });
export const deleteCategory = (id, tx = prisma) => tx.GalleryCategory.delete({ where: { id } });
export const listPublicGallery = (where = {}, tx = prisma) => tx.GalleryImage.findMany({ where: { status: "PUBLISHED", ...where, category: { active: true, ...(where.category ?? {}) } }, include: { category: { select: { id: true, name: true, slug: true } } }, orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }] });
export const listGallery = (tx = prisma) => tx.GalleryImage.findMany({ include: { category: { select: { id: true, name: true, slug: true } } }, orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }] });
export const findGalleryImage = (id, tx = prisma) => tx.GalleryImage.findUnique({ where: { id } });
export const createGalleryImage = (data, tx = prisma) => tx.GalleryImage.create({ data, include: { category: true } });
export const updateGalleryImage = (id, data, tx = prisma) => tx.GalleryImage.update({ where: { id }, data, include: { category: true } });
export const deleteGalleryImage = (id, tx = prisma) => tx.GalleryImage.delete({ where: { id } });
export const listPublicResources = (where = {}, tx = prisma) => tx.Resource.findMany({ where: { status: "PUBLISHED", ...where }, include: { trainingProgram: { select: { title: true, slug: true } } }, orderBy: [{ publishedAt: "desc" }, { title: "asc" }] });
export const findPublicResource = (slug, tx = prisma) => tx.Resource.findFirst({ where: { slug, status: "PUBLISHED" }, include: { trainingProgram: { select: { title: true, slug: true } } } });
export const listResources = (tx = prisma) => tx.Resource.findMany({ include: { trainingProgram: { select: { title: true, slug: true } } }, orderBy: [{ updatedAt: "desc" }] });
export const findResource = (id, tx = prisma) => tx.Resource.findUnique({ where: { id } });
export const createResource = (data, tx = prisma) => tx.Resource.create({ data });
export const updateResource = (id, data, tx = prisma) => tx.Resource.update({ where: { id }, data, include: { trainingProgram: { select: { title: true, slug: true } } } });
export const deleteResource = (id, tx = prisma) => tx.Resource.delete({ where: { id } });


const siteBrandingId = "site-branding";
export const getSiteBranding = (tx = prisma) => tx.SiteBranding.findUnique({ where: { id: siteBrandingId } });
export const upsertSiteBranding = (data, tx = prisma) => tx.SiteBranding.upsert({ where: { id: siteBrandingId }, create: { id: siteBrandingId, ...data }, update: data });
