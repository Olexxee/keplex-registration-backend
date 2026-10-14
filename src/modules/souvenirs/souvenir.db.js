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

export const findActiveColorOptionsByIds = (productId, ids, tx = prisma) =>
  tx.souvenirColorOption.findMany({
    where: { productId, id: { in: ids }, active: true },
    select: { id: true, name: true, colorHex: true },
  });


const orderInclude = {
  colorSelections: { orderBy: { createdAt: "asc" } },
};

const quoteInclude = {
  items: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
  media: { orderBy: { createdAt: "asc" } },
};

const enquiryInclude = {
  media: { orderBy: { createdAt: "asc" } },
  product: { select: { id: true, name: true, slug: true } },
  quotes: { orderBy: { version: "desc" }, include: quoteInclude },
};

export const findActiveProductForOrder = (id, tx = prisma) =>
  tx.souvenirProduct.findFirst({
    where: { id, active: true },
    include: {
      colorOptions: { where: { active: true } },
      priceTiers: { where: { active: true } },
    },
  });

export const createSouvenirOrder = (data, tx = prisma) =>
  tx.souvenirOrder.create({ data, include: orderInclude });

export const createSouvenirOrderColors = (orderId, colors, tx = prisma) =>
  tx.souvenirOrderColor.createMany({
    data: colors.map((color) => ({ ...color, orderId })),
  });

export const findOrderByTokenHash = (accessTokenHash, tx = prisma) =>
  tx.souvenirOrder.findUnique({
    where: { accessTokenHash },
    include: { ...orderInclude, product: { select: { name: true, slug: true } } },
  });

export const listSouvenirOrders = ({ status, page = 1, limit = 20 } = {}, tx = prisma) =>
  tx.souvenirOrder.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: { ...orderInclude, product: { select: { id: true, name: true, slug: true } } },
  });

export const countSouvenirOrders = (where = {}, tx = prisma) =>
  tx.souvenirOrder.count({ where });

export const findSouvenirOrderById = (id, tx = prisma) =>
  tx.souvenirOrder.findUnique({
    where: { id },
    include: { ...orderInclude, product: { select: { id: true, name: true, slug: true } } },
  });

export const updateSouvenirOrder = (id, data, tx = prisma) =>
  tx.souvenirOrder.update({
    where: { id },
    data,
    include: { ...orderInclude, product: { select: { id: true, name: true, slug: true } } },
  });

export const createSouvenirEnquiry = (data, tx = prisma) =>
  tx.souvenirEnquiry.create({ data, include: enquiryInclude });

export const createSouvenirEnquiryMedia = (data, tx = prisma) =>
  tx.souvenirEnquiryMedia.createMany({ data });

export const findEnquiryByTokenHash = (accessTokenHash, tx = prisma) =>
  tx.souvenirEnquiry.findUnique({
    where: { accessTokenHash },
    include: enquiryInclude,
  });

export const listSouvenirEnquiries = ({ status, page = 1, limit = 20 } = {}, tx = prisma) =>
  tx.souvenirEnquiry.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: enquiryInclude,
  });

export const countSouvenirEnquiries = (where = {}, tx = prisma) =>
  tx.souvenirEnquiry.count({ where });

export const findSouvenirEnquiryById = (id, tx = prisma) =>
  tx.souvenirEnquiry.findUnique({
    where: { id },
    include: enquiryInclude,
  });

export const updateSouvenirEnquiry = (id, data, tx = prisma) =>
  tx.souvenirEnquiry.update({
    where: { id },
    data,
    include: enquiryInclude,
  });


export const getNextSouvenirQuoteVersion = async (enquiryId, tx = prisma) => {
  const latest = await tx.souvenirQuote.findFirst({
    where: { enquiryId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version ?? 0) + 1;
};

export const createSouvenirQuote = (data, tx = prisma) =>
  tx.souvenirQuote.create({
    data: {
      ...data,
      items: { create: data.items },
    },
    include: quoteInclude,
  });

export const findSouvenirQuoteById = (id, tx = prisma) =>
  tx.souvenirQuote.findUnique({ where: { id }, include: quoteInclude });

export const findSouvenirQuoteByIdAndEnquiry = (id, enquiryId, tx = prisma) =>
  tx.souvenirQuote.findFirst({ where: { id, enquiryId }, include: quoteInclude });

export const updateSouvenirQuote = (id, data, tx = prisma) =>
  tx.souvenirQuote.update({ where: { id }, data, include: quoteInclude });

export const updateSouvenirQuotes = (where, data, tx = prisma) =>
  tx.souvenirQuote.updateMany({ where, data });

export const createSouvenirQuoteMedia = (data, tx = prisma) =>
  tx.souvenirQuoteMedia.createMany({ data });

export const updateSouvenirEnquiryStatus = (id, status, tx = prisma) =>
  tx.souvenirEnquiry.update({ where: { id }, data: { status }, include: enquiryInclude });
