import { prisma } from "../../config/prisma.js";

const publicInclude = {
  media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
  colorOptions: {
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, colorHex: true, swatchImageUrl: true, displayOrder: true },
  },
  priceTiers: {
    where: { active: true },
    orderBy: [{ minQuantity: "asc" }, { displayOrder: "asc" }],
    select: { id: true, label: true, minQuantity: true, maxQuantity: true, totalPrice: true, currency: true, displayOrder: true },
  },
};
const adminInclude = {
  media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
  colorOptions: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] },
  priceTiers: { orderBy: [{ minQuantity: "asc" }, { displayOrder: "asc" }] },
};

export const listPublicProducts = (tx = prisma) => tx.souvenirProduct.findMany({
  where: { active: true },
  orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
  include: publicInclude,
});
export const findPublicProductBySlug = (slug, tx = prisma) => tx.souvenirProduct.findFirst({
  where: { slug, active: true },
  include: publicInclude,
});
export const listAdminProducts = (tx = prisma) => tx.souvenirProduct.findMany({
  orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  include: adminInclude,
});
export const findProductById = (id, tx = prisma) => tx.souvenirProduct.findUnique({
  where: { id }, include: adminInclude,
});
export const findProductBySlug = (slug, tx = prisma) => tx.souvenirProduct.findUnique({
  where: { slug }, select: { id: true, slug: true },
});
export const createProduct = (data, tx = prisma) => tx.souvenirProduct.create({
  data, include: adminInclude,
});
export const updateProduct = (id, data, tx = prisma) => tx.souvenirProduct.update({
  where: { id }, data, include: adminInclude,
});
export const createColorOption = (data, tx = prisma) => tx.souvenirColorOption.create({ data });
export const findColorOptionById = (id, tx = prisma) => tx.souvenirColorOption.findUnique({
  where: { id }, include: { product: true },
});
export const updateColorOption = (id, data, tx = prisma) => tx.souvenirColorOption.update({ where: { id }, data });
export const createPriceTier = (data, tx = prisma) => tx.souvenirPriceTier.create({ data });
export const findPriceTierById = (id, tx = prisma) => tx.souvenirPriceTier.findUnique({
  where: { id }, include: { product: true },
});
export const listPriceTiersForProduct = (productId, tx = prisma) => tx.souvenirPriceTier.findMany({
  where: { productId }, orderBy: [{ minQuantity: "asc" }, { displayOrder: "asc" }],
});
export const updatePriceTier = (id, data, tx = prisma) => tx.souvenirPriceTier.update({ where: { id }, data });
export const createProductMedia = (data, tx = prisma) => tx.souvenirProductMedia.create({ data });
export const findProductMediaById = (id, tx = prisma) => tx.souvenirProductMedia.findUnique({ where: { id } });
export const updateProductMedia = (id, data, tx = prisma) => tx.souvenirProductMedia.update({ where: { id }, data });
export const clearPrimaryProductMedia = (productId, tx = prisma) => tx.souvenirProductMedia.updateMany({
  where: { productId, isPrimary: true }, data: { isPrimary: false },
});
export const getActivePriceTierCount = (productId, tx = prisma) => tx.souvenirPriceTier.count({
  where: { productId, active: true },
});
