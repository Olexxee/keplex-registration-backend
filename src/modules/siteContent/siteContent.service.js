import slugify from "slugify";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as db from "./siteContent.db.js";

export const getPublicHero = async () => db.findPublishedHero();
export const getAdminHeroes = async () => db.listHeroes();
export const createHero = async (data) => db.createHero(data);
export const updateHero = async (id, data) => {
  if (!(await db.findHero(id))) throw new NotFoundError("Hero version not found");
  return db.updateHero(id, data);
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
  if (!(await db.findCategory?.(id))) {
    // Existence is enforced by Prisma for update; use the standard not-found response below.
  }
  try { return await db.updateCategory(id, data); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Gallery category not found"); throw error; }
};
export const deleteCategory = async (id) => {
  try { return await db.deleteCategory(id); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Gallery category not found"); throw error; }
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
  try { return await db.deleteGalleryImage(id); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Gallery image not found"); throw error; }
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
  const update = { ...data };
  if (data.title && !data.slug) update.slug = slugify(data.title, { lower: true, strict: true });
  if (data.status === "PUBLISHED") update.publishedAt = new Date();
  if (data.status && data.status !== "PUBLISHED") update.publishedAt = null;
  try { return await db.updateResource(id, update); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Resource not found"); throw error; }
};
export const deleteResource = async (id) => {
  try { return await db.deleteResource(id); }
  catch (error) { if (error?.code === "P2025") throw new NotFoundError("Resource not found"); throw error; }
};
