import slugify from "slugify";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as db from "./siteContent.db.js";
import { deleteMedia } from "../../lib/cloudinaryMedia.js";

export const getPublicHero = async () => db.findPublishedHero();
export const getAdminHeroes = async () => db.listHeroes();
export const createHero = async (data) => db.createHero(data);
export const updateHero = async (id, data) => {
  const existing = await db.findHero(id);
  if (!existing) throw new NotFoundError("Hero version not found");
  if (existing.status === "PUBLISHED") throw new BadRequestError("Published hero versions are immutable. Create a new draft and publish it when ready.");
  const updated = await db.updateHero(id, data);
  if (data.imagePublicId && existing.imagePublicId && data.imagePublicId !== existing.imagePublicId) {
    try { await deleteMedia({ publicId: existing.imagePublicId, resourceType: "image" }); }
    catch (error) { console.error("[site-content] Failed to remove replaced hero image from Cloudinary", error); }
  }
  return updated;
};
export const publishHero = async (id) => {
  const hero = await db.publishHero(id);
  if (!hero) throw new NotFoundError("Hero version not found");
  return hero;
};
export const getPublicCategories = async () => db.listPublicCategories();
export const getAdminCategories = async () => db.listCategories();
export const createCategory = async (data) => db.createCategory(data);
export const updateCategory = async (id, data) => {
  if (!(await db.findCategory(id))) throw new NotFoundError("Gallery category not found");
  try { return await db.updateCategory(id, data); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Gallery category not found"); throw error; }
};
export const deleteCategory = async (id) => {
  const existing = await db.findCategory(id);
  if (!existing) throw new NotFoundError("Gallery category not found");
  const deleted = await db.deleteCategory(id);
  for (const image of existing.images) {
    try { await deleteMedia({ publicId: image.publicId, resourceType: "image" }); }
    catch (error) { console.error("[site-content] Failed to remove gallery asset after category deletion", error); }
  }
  return deleted;
};
export const getPublicGallery = async (query = {}) => {
  const where = {};
  if (query.category) where.category = { slug: query.category, active: true };
  if (query.featured !== undefined) where.featured = query.featured;
  return db.listPublicGallery(where);
};
export const getAdminGallery = async () => db.listGallery();
export const createGalleryImage = async (data) => db.createGalleryImage({ ...data, status: "DRAFT" });
export const updateGalleryImage = async (id, data) => {
  const update = { ...data };
  if (data.status === "PUBLISHED") update.publishedAt = new Date();
  if (data.status && data.status !== "PUBLISHED") update.publishedAt = null;
  try { return await db.updateGalleryImage(id, update); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Gallery image not found"); throw error; }
};
export const deleteGalleryImage = async (id) => {
  const existing = await db.findGalleryImage(id);
  if (!existing) throw new NotFoundError("Gallery image not found");
  const deleted = await db.deleteGalleryImage(id);
  try { await deleteMedia({ publicId: existing.publicId, resourceType: "image" }); }
  catch (error) { console.error("[site-content] Failed to remove gallery asset from Cloudinary", error); }
  return deleted;
};
export const getPublicResources = async (query = {}) => {
  const where = {};
  if (query.search) where.OR = [{ title: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }];
  if (query.program) where.trainingProgram = { slug: query.program };
  return db.listPublicResources(where);
};
export const getPublicResource = async (slug) => {
  const resource = await db.findPublicResource(slug);
  if (!resource) throw new NotFoundError("Resource not found");
  return resource;
};
export const getAdminResources = async () => db.listResources();
export const createResource = async (data) => db.createResource({ ...data, slug: slugify(data.slug || data.title, { lower: true, strict: true }), status: "DRAFT" });
export const updateResource = async (id, data) => {
  const existing = await db.findResource(id);
  if (!existing) throw new NotFoundError("Resource not found");
  const update = { ...data };
  if (data.title && !data.slug) update.slug = slugify(data.title, { lower: true, strict: true });
  if (data.status === "PUBLISHED") update.publishedAt = new Date();
  if (data.status && data.status !== "PUBLISHED") update.publishedAt = null;
  const updated = await db.updateResource(id, update);
  if (data.filePublicId && data.filePublicId !== existing.filePublicId) {
    try { await deleteMedia({ publicId: existing.filePublicId, resourceType: existing.fileResourceType || "image" }); }
    catch (error) { console.error("[site-content] Failed to remove replaced PDF from Cloudinary", error); }
  }
  if (data.coverImagePublicId && existing.coverImagePublicId && data.coverImagePublicId !== existing.coverImagePublicId) {
    try { await deleteMedia({ publicId: existing.coverImagePublicId, resourceType: "image" }); }
    catch (error) { console.error("[site-content] Failed to remove replaced resource cover from Cloudinary", error); }
  }
  return updated;
};
export const deleteResource = async (id) => {
  const existing = await db.findResource(id);
  if (!existing) throw new NotFoundError("Resource not found");
  const deleted = await db.deleteResource(id);
  try { await deleteMedia({ publicId: existing.filePublicId, resourceType: existing.fileResourceType || "image" }); }
  catch (error) { console.error("[site-content] Failed to remove PDF from Cloudinary", error); }
  if (existing.coverImagePublicId) {
    try { await deleteMedia({ publicId: existing.coverImagePublicId, resourceType: "image" }); }
    catch (error) { console.error("[site-content] Failed to remove resource cover from Cloudinary", error); }
  }
  return deleted;
};
