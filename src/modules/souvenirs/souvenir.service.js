import slugify from "slugify";
import { prisma } from "../../config/prisma.js";
import * as souvenirDb from "./souvenir.db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../classes/errorClasses.js";

const makeSlug = (value) => slugify(value, { lower: true, strict: true, trim: true });

const uniqueSlug = async (value, currentId = null) => {
  const base = makeSlug(value);
  if (!base) throw new BadRequestError("Product name must contain letters or numbers");
  let candidate = base;
  let suffix = 2;
  while (true) {
    const existing = await souvenirDb.findProductBySlug(candidate);
    if (!existing || existing.id === currentId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
};

const requireProduct = async (id) => {
  const product = await souvenirDb.findProductById(id);
  if (!product) throw new NotFoundError("Souvenir product not found");
  return product;
};

const handleUniqueConflict = (error, message) => {
  if (error?.code === "P2002") throw new ConflictError(message);
  throw error;
};

export const getPublicProducts = () => souvenirDb.listPublicProducts();

export const getPublicProductBySlug = async (slug) => {
  const product = await souvenirDb.findPublicProductBySlug(slug);
  if (!product) throw new NotFoundError("Souvenir product not found");
  return product;
};

export const getAdminProducts = () => souvenirDb.listAdminProducts();

export const createProduct = async (data) => {
  const slug = await uniqueSlug(data.slug || data.name);
  return souvenirDb.createProduct({
    name: data.name,
    slug,
    description: data.description ?? null,
    bookingTerms: data.bookingTerms ?? null,
    productionLeadTimeDays: data.productionLeadTimeDays ?? null,
    featured: data.featured ?? false,
    displayOrder: data.displayOrder ?? 0,
    active: false,
  });
};

export const updateProduct = async (id, data) => {
  const existing = await requireProduct(id);
  const update = { ...data };
  if (data.slug || (data.name && data.name !== existing.name)) {
    update.slug = await uniqueSlug(data.slug || data.name, id);
  }
  try {
    return await souvenirDb.updateProduct(id, update);
  } catch (error) {
    handleUniqueConflict(error, "A souvenir product with this slug already exists");
  }
};

export const setProductActive = async (id, active) => {
  await requireProduct(id);
  if (active && (await souvenirDb.getActivePriceTierCount(id)) === 0) {
    throw new ConflictError("Add at least one active price tier before publishing this souvenir");
  }
  return souvenirDb.updateProduct(id, { active });
};

export const validateSelectedColorOptions = async (productId, colorOptionIds) => {
  if (!Array.isArray(colorOptionIds) || colorOptionIds.length < 1 || colorOptionIds.length > 3) {
    throw new BadRequestError("Select between one and three colours");
  }
  if (new Set(colorOptionIds).size !== colorOptionIds.length) {
    throw new BadRequestError("Selected colours must be unique");
  }
  const colors = await souvenirDb.findActiveColorOptionsByIds(productId, colorOptionIds);
  if (colors.length !== colorOptionIds.length) {
    throw new BadRequestError("Every selected colour must be active and belong to the selected souvenir");
  }
  return colors.map((color) => ({
    colorOptionId: color.id,
    nameSnapshot: color.name,
    colorHexSnapshot: color.colorHex,
  }));
};

export const createColorOption = async (productId, data) => {
  await requireProduct(productId);
  try {
    return await souvenirDb.createColorOption({
      productId,
      name: data.name,
      colorHex: data.colorHex.toUpperCase(),
      swatchImageUrl: data.swatchImageUrl ?? null,
      swatchPublicId: data.swatchPublicId ?? null,
      displayOrder: data.displayOrder ?? 0,
      active: true,
    });
  } catch (error) {
    handleUniqueConflict(error, "A colour with this name already exists for this souvenir");
  }
};

export const updateColorOption = async (colorId, data) => {
  const existing = await souvenirDb.findColorOptionById(colorId);
  if (!existing) throw new NotFoundError("Souvenir colour option not found");
  const update = { ...data };
  if (update.colorHex) update.colorHex = update.colorHex.toUpperCase();
  try {
    return await souvenirDb.updateColorOption(colorId, update);
  } catch (error) {
    handleUniqueConflict(error, "A colour with this name already exists for this souvenir");
  }
};

export const setColorOptionActive = async (colorId, active) => {
  const existing = await souvenirDb.findColorOptionById(colorId);
  if (!existing) throw new NotFoundError("Souvenir colour option not found");
  return souvenirDb.updateColorOption(colorId, { active });
};

const overlaps = (a, b) => {
  const aMax = a.maxQuantity ?? Number.POSITIVE_INFINITY;
  const bMax = b.maxQuantity ?? Number.POSITIVE_INFINITY;
  return a.minQuantity <= bMax && b.minQuantity <= aMax;
};

const assertNoTierOverlap = (candidate, tiers, excludedId = null) => {
  if (candidate.maxQuantity != null && candidate.maxQuantity < candidate.minQuantity) {
    throw new BadRequestError("Maximum quantity must be greater than or equal to minimum quantity");
  }
  const conflict = tiers.find((tier) => tier.id !== excludedId && overlaps(candidate, tier));
  if (conflict) throw new ConflictError(`Quantity range overlaps the existing tier "${conflict.label}"`);
};

export const createPriceTier = async (productId, data) => {
  await requireProduct(productId);
  const tiers = await souvenirDb.listPriceTiersForProduct(productId);
  assertNoTierOverlap(data, tiers);
  return souvenirDb.createPriceTier({
    productId,
    label: data.label,
    minQuantity: data.minQuantity,
    maxQuantity: data.maxQuantity ?? null,
    totalPrice: data.totalPrice,
    currency: data.currency ?? "NGN",
    displayOrder: data.displayOrder ?? 0,
    active: true,
  });
};

export const updatePriceTier = async (tierId, data) => {
  const existing = await souvenirDb.findPriceTierById(tierId);
  if (!existing) throw new NotFoundError("Souvenir price tier not found");
  const candidate = { ...existing, ...data };
  const tiers = await souvenirDb.listPriceTiersForProduct(existing.productId);
  assertNoTierOverlap(candidate, tiers, tierId);
  return souvenirDb.updatePriceTier(tierId, data);
};

export const setPriceTierActive = async (tierId, active) => {
  const existing = await souvenirDb.findPriceTierById(tierId);
  if (!existing) throw new NotFoundError("Souvenir price tier not found");
  if (active) {
    const tiers = await souvenirDb.listPriceTiersForProduct(existing.productId);
    assertNoTierOverlap(existing, tiers, tierId);
  }
  return souvenirDb.updatePriceTier(tierId, { active });
};

export const createProductMedia = async (productId, data) => {
  await requireProduct(productId);
  if (data.isPrimary) {
    return prisma.$transaction(async (tx) => {
      await souvenirDb.clearPrimaryProductMedia(productId, tx);
      return souvenirDb.createProductMedia({ ...data, productId }, tx);
    });
  }
  return souvenirDb.createProductMedia({ ...data, productId });
};

export const updateProductMedia = async (mediaId, data) => {
  const existing = await souvenirDb.findProductMediaById(mediaId);
  if (!existing) throw new NotFoundError("Souvenir product image not found");
  if (data.isPrimary) {
    return prisma.$transaction(async (tx) => {
      await souvenirDb.clearPrimaryProductMedia(existing.productId, tx);
      return souvenirDb.updateProductMedia(mediaId, data, tx);
    });
  }
  return souvenirDb.updateProductMedia(mediaId, data);
};
