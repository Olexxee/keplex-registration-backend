import slugify from "slugify";
import { prisma } from "../../config/prisma.js";
import * as souvenirDb from "./souvenir.db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import crypto from "node:crypto";
import { uploadMedia, deleteMedia } from "../../lib/cloudinaryMedia.js";

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

export const validateSelectedColorOptions = async (productId, colorOptionIds, tx) => {
  if (!Array.isArray(colorOptionIds) || colorOptionIds.length < 1 || colorOptionIds.length > 3) {
    throw new BadRequestError("Select between one and three colours");
  }
  if (new Set(colorOptionIds).size !== colorOptionIds.length) {
    throw new BadRequestError("Selected colours must be unique");
  }
  const colors = await souvenirDb.findActiveColorOptionsByIds(productId, colorOptionIds, tx);
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

export const uploadProductMedia = async (productId, files = []) => {
  await requireProduct(productId);
  if (!files.length) throw new BadRequestError("Select at least one package reference image");
  if (files.length > 10) throw new BadRequestError("A maximum of 10 package images can be uploaded at once");

  const uploadedAssets = [];
  try {
    for (const file of files) {
      const uploaded = await uploadMedia({
        buffer: file.buffer,
        mimeType: file.mimetype,
        folder: "keplex/souvenirs/products",
      });
      uploadedAssets.push({
        productId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        altText: file.originalname?.slice(0, 300) ?? null,
        isPrimary: false,
        sortOrder: uploadedAssets.length,
      });
    }

    const created = [];
    for (const asset of uploadedAssets) {
      created.push(await souvenirDb.createProductMedia(asset));
    }
    if (!(await souvenirDb.findProductById(productId)).media.some((item) => item.isPrimary) && created.length) {
      await souvenirDb.clearPrimaryProductMedia(productId);
      created[0] = await souvenirDb.updateProductMedia(created[0].id, { isPrimary: true });
    }
    return created;
  } catch (error) {
    await Promise.all(uploadedAssets.map((asset) =>
      deleteMedia({ publicId: asset.publicId, resourceType: asset.resourceType ?? "image" }).catch(() => {})
    ));
    throw error;
  }
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


const createGuestCredentials = (prefix) => {
  const publicReference = `KPX-${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const accessToken = crypto.randomBytes(32).toString("hex");
  const accessTokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
  return { publicReference, accessToken, accessTokenHash };
};

const stripOrderSecrets = (order) => {
  if (!order) return order;
  const { accessTokenHash, ...safe } = order;
  return safe;
};
const stripEnquirySecrets = (enquiry) => {
  if (!enquiry) return enquiry;
  const { accessTokenHash, ...safe } = enquiry;
  return safe;
};

export const createGuestSouvenirOrder = async (data) => {
  const { publicReference, accessToken, accessTokenHash } = createGuestCredentials("SOUV");

  const order = await prisma.$transaction(async (tx) => {
    // Read the product, active tier, and active colours inside the same transaction
    // used to persist the immutable order snapshots.
    const product = await souvenirDb.findActiveProductForOrder(data.productId, tx);
    if (!product) throw new NotFoundError("Souvenir package is unavailable");

    const tier = product.priceTiers.find((item) =>
      data.quantity >= item.minQuantity &&
      (item.maxQuantity == null || data.quantity <= item.maxQuantity)
    );
    if (!tier) {
      throw new BadRequestError("The selected quantity does not match an available price package");
    }
    if (tier.currency !== "NGN") {
      throw new BadRequestError("Only NGN souvenir orders are currently supported");
    }

    const colorSnapshots = await validateSelectedColorOptions(data.productId, data.colorOptionIds, tx);
    const created = await souvenirDb.createSouvenirOrder({
      publicReference,
      accessTokenHash,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerWhatsApp: data.customerWhatsApp,
      productId: product.id,
      priceTierId: tier.id,
      productNameSnapshot: product.name,
      priceTierLabelSnapshot: tier.label,
      quantity: data.quantity,
      totalPriceSnapshot: tier.totalPrice,
      currency: tier.currency,
      bookingTermsSnapshot: product.bookingTerms,
      productionLeadTimeDaysSnapshot: product.productionLeadTimeDays,
      customerNotes: data.customerNotes ?? null,
      status: "SUBMITTED",
    }, tx);

    await souvenirDb.createSouvenirOrderColors(created.id, colorSnapshots.map((color) => {
      const source = product.colorOptions.find((option) => option.id === color.colorOptionId);
      return {
        colorOptionId: color.colorOptionId,
        nameSnapshot: color.nameSnapshot,
        colorHexSnapshot: color.colorHexSnapshot,
        swatchImageUrlSnapshot: source?.swatchImageUrl ?? null,
      };
    }), tx);

    return souvenirDb.findSouvenirOrderById(created.id, tx);
  });

  return {
    order: {
      publicReference: order.publicReference,
      productName: order.productNameSnapshot,
      quantity: order.quantity,
      totalPrice: order.totalPriceSnapshot,
      currency: order.currency,
      status: order.status,
      colorSelections: order.colorSelections,
    },
    accessToken,
    accessUrlPath: `/api/souvenirs/orders/access/${accessToken}`,
  };
};

export const getGuestSouvenirOrder = async (token) => {
  const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const order = await souvenirDb.findOrderByTokenHash(accessTokenHash);
  if (!order) throw new NotFoundError("Souvenir order not found");
  return {
    publicReference: order.publicReference,
    customerName: order.customerName,
    productName: order.productNameSnapshot,
    quantity: order.quantity,
    totalPrice: order.totalPriceSnapshot,
    currency: order.currency,
    status: order.status,
    colors: order.colorSelections,
    customerNotes: order.customerNotes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

const allowedOrderTransitions = {
  SUBMITTED: ["AWAITING_PAYMENT", "CANCELLED", "REJECTED"],
  AWAITING_PAYMENT: ["CANCELLED", "REJECTED"],
  PAID: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["FULFILLED"],
  FULFILLED: [],
  CANCELLED: [],
  REJECTED: [],
};

export const listAdminSouvenirOrders = async (query) => {
  const allowed = ["SUBMITTED", "AWAITING_PAYMENT", "PAID", "IN_PRODUCTION", "READY", "FULFILLED", "CANCELLED", "REJECTED"];
  if (query.status && !allowed.includes(query.status)) throw new BadRequestError("Invalid souvenir order status");
  const [items, total] = await Promise.all([
    souvenirDb.listSouvenirOrders(query),
    souvenirDb.countSouvenirOrders(query.status ? { status: query.status } : {}),
  ]);
  return { items: items.map(stripOrderSecrets), pagination: { page: query.page, limit: query.limit, total } };
};

export const getAdminSouvenirOrder = async (id) => {
  const order = await souvenirDb.findSouvenirOrderById(id);
  if (!order) throw new NotFoundError("Souvenir order not found");
  return stripOrderSecrets(order);
};

export const updateAdminSouvenirOrder = async (id, data) => {
  const existing = await souvenirDb.findSouvenirOrderById(id);
  if (!existing) throw new NotFoundError("Souvenir order not found");
  if (data.status && data.status !== existing.status && !allowedOrderTransitions[existing.status].includes(data.status)) {
    throw new ConflictError(`Cannot change a souvenir order from ${existing.status} to ${data.status}`);
  }
  const updated = await souvenirDb.updateSouvenirOrder(id, {
    ...(data.status ? { status: data.status } : {}),
    ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
  });
  return stripOrderSecrets(updated);
};

export const createGuestSouvenirEnquiry = async ({ data, files = [] }) => {
  if (files.length > 10) throw new BadRequestError("A maximum of 10 reference files is allowed");
  if (data.productId) {
    const product = await souvenirDb.findActiveProductForOrder(data.productId);
    if (!product) throw new NotFoundError("The selected souvenir package was not found");
  }

  const uploadedAssets = [];
  try {
    for (const file of files) {
      const uploaded = await uploadMedia({
        buffer: file.buffer,
        mimeType: file.mimetype,
        folder: "keplex/souvenirs/enquiries",
      });
      uploadedAssets.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        mimeType: file.mimetype,
        bytes: uploaded.bytes,
        originalName: file.originalname?.slice(0, 255) ?? null,
      });
    }

    const { publicReference, accessToken, accessTokenHash } = createGuestCredentials("ENQ");
    const enquiry = await prisma.$transaction(async (tx) => {
      const created = await souvenirDb.createSouvenirEnquiry({
        publicReference,
        accessTokenHash,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerWhatsApp: data.customerWhatsApp,
        productId: data.productId ?? null,
        requestedQuantity: data.requestedQuantity ?? null,
        designDescription: data.designDescription,
        status: "NEW",
      }, tx);

      if (uploadedAssets.length) {
        await souvenirDb.createSouvenirEnquiryMedia(
          uploadedAssets.map((asset) => ({ ...asset, enquiryId: created.id })),
          tx,
        );
      }
      return souvenirDb.findSouvenirEnquiryById(created.id, tx);
    });

    return {
      enquiry: {
        publicReference: enquiry.publicReference,
        status: enquiry.status,
        mediaCount: enquiry.media.length,
        createdAt: enquiry.createdAt,
      },
      accessToken,
      accessUrlPath: `/api/souvenirs/enquiries/access/${accessToken}`,
    };
  } catch (error) {
    await Promise.all(uploadedAssets.map((asset) =>
      deleteMedia({ publicId: asset.publicId, resourceType: asset.resourceType }).catch(() => {})
    ));
    throw error;
  }
};

export const getGuestSouvenirEnquiry = async (token) => {
  const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const enquiry = await souvenirDb.findEnquiryByTokenHash(accessTokenHash);
  if (!enquiry) throw new NotFoundError("Souvenir enquiry not found");
  return {
    publicReference: enquiry.publicReference,
    customerName: enquiry.customerName,
    product: enquiry.product,
    requestedQuantity: enquiry.requestedQuantity,
    designDescription: enquiry.designDescription,
    status: enquiry.status,
    responseMessage: enquiry.responseMessage,
    media: enquiry.media.map(({ url, mimeType, originalName, bytes }) => ({ url, mimeType, originalName, bytes })),
    latestQuote: enquiry.quotes
      .filter((quote) => ["SENT", "ACCEPTED", "DECLINED", "EXPIRED"].includes(quote.status))
      .sort((a, b) => b.version - a.version)
      .slice(0, 1)
      .map((quote) => ({
        id: quote.id,
        version: quote.version,
        status: quote.status,
        currency: quote.currency,
        totalAmount: quote.totalAmount,
        terms: quote.terms,
        message: quote.message,
        expiresAt: quote.expiresAt,
        sentAt: quote.sentAt,
        respondedAt: quote.respondedAt,
        items: quote.items,
        media: quote.media.map(({ url, mimeType, originalName, bytes }) => ({ url, mimeType, originalName, bytes })),
      }))[0] ?? null,
    createdAt: enquiry.createdAt,
    updatedAt: enquiry.updatedAt,
  };
};

export const listAdminSouvenirEnquiries = async (query) => {
  const allowed = ["NEW", "UNDER_REVIEW", "RESPONDED", "ACCEPTED", "DECLINED", "CLOSED"];
  if (query.status && !allowed.includes(query.status)) throw new BadRequestError("Invalid souvenir enquiry status");
  const [items, total] = await Promise.all([
    souvenirDb.listSouvenirEnquiries(query),
    souvenirDb.countSouvenirEnquiries(query.status ? { status: query.status } : {}),
  ]);
  return { items: items.map(stripEnquirySecrets), pagination: { page: query.page, limit: query.limit, total } };
};

export const getAdminSouvenirEnquiry = async (id) => {
  const enquiry = await souvenirDb.findSouvenirEnquiryById(id);
  if (!enquiry) throw new NotFoundError("Souvenir enquiry not found");
  return stripEnquirySecrets(enquiry);
};

export const updateAdminSouvenirEnquiry = async (id, data) => {
  const existing = await souvenirDb.findSouvenirEnquiryById(id);
  if (!existing) throw new NotFoundError("Souvenir enquiry not found");
  const update = { ...data };
  if (data.status === "RESPONDED" || data.responseMessage) {
    update.status = data.status ?? "RESPONDED";
    update.respondedAt = new Date();
  }
  const updated = await souvenirDb.updateSouvenirEnquiry(id, update);
  return stripEnquirySecrets(updated);
};


// ────────────────────────────────────────────────────────────
// Custom souvenir quotation workflow
// ────────────────────────────────────────────────────────────

const quoteAllowedEnquiryStatuses = ["NEW", "UNDER_REVIEW", "RESPONDED"];

const toCents = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new BadRequestError("Quote prices must be positive amounts");
  }
  return Math.round(number * 100);
};

const centsToDecimalString = (cents) => (cents / 100).toFixed(2);

const quotePublicView = (quote) => ({
  id: quote.id,
  version: quote.version,
  status: quote.status,
  currency: quote.currency,
  totalAmount: quote.totalAmount,
  terms: quote.terms,
  message: quote.message,
  expiresAt: quote.expiresAt,
  sentAt: quote.sentAt,
  respondedAt: quote.respondedAt,
  items: quote.items,
  media: quote.media.map(({ url, mimeType, originalName, bytes }) => ({ url, mimeType, originalName, bytes })),
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});

export const createAdminSouvenirQuote = async (enquiryId, data) => {
  const enquiry = await souvenirDb.findSouvenirEnquiryById(enquiryId);
  if (!enquiry) throw new NotFoundError("Souvenir enquiry not found");
  if (!quoteAllowedEnquiryStatuses.includes(enquiry.status)) {
    throw new ConflictError("A quotation cannot be created for an enquiry that is already accepted, declined, or closed");
  }
  if (data.currency !== "NGN") {
    throw new BadRequestError("Only NGN souvenir quotations are currently supported");
  }
  if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
    throw new BadRequestError("Quote expiry must be in the future");
  }

  const items = data.items.map((item, index) => {
    const unitPriceCents = toCents(item.unitPrice);
    const lineTotalCents = unitPriceCents * item.quantity;
    if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > 999999999999) {
      throw new BadRequestError("A quote line total is outside the supported range");
    }
    return {
      name: item.name,
      description: item.description ?? null,
      quantity: item.quantity,
      unitPrice: centsToDecimalString(unitPriceCents),
      lineTotal: centsToDecimalString(lineTotalCents),
      displayOrder: item.displayOrder ?? index,
      _lineTotalCents: lineTotalCents,
    };
  });

  const totalCents = items.reduce((sum, item) => sum + item._lineTotalCents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > 999999999999) {
    throw new BadRequestError("Quote total is outside the supported range");
  }

  return prisma.$transaction(async (tx) => {
    const current = await souvenirDb.findSouvenirEnquiryById(enquiryId, tx);
    if (!current) throw new NotFoundError("Souvenir enquiry not found");
    if (!quoteAllowedEnquiryStatuses.includes(current.status)) {
      throw new ConflictError("A quotation cannot be created for this enquiry in its current status");
    }
    const version = await souvenirDb.getNextSouvenirQuoteVersion(enquiryId, tx);
    const quote = await souvenirDb.createSouvenirQuote({
      enquiryId,
      version,
      status: "DRAFT",
      currency: data.currency,
      totalAmount: centsToDecimalString(totalCents),
      terms: data.terms ?? null,
      message: data.message ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      items: items.map(({ _lineTotalCents, ...item }) => item),
    }, tx);
    if (current.status === "NEW") {
      await souvenirDb.updateSouvenirEnquiry(enquiryId, { status: "UNDER_REVIEW" }, tx);
    }
    return quote;
  });
};

export const addAdminSouvenirQuoteMedia = async (enquiryId, quoteId, files = []) => {
  if (!files.length) throw new BadRequestError("Attach at least one reference image");
  if (files.length > 10) throw new BadRequestError("A maximum of 10 reference files is allowed");

  const quote = await souvenirDb.findSouvenirQuoteByIdAndEnquiry(quoteId, enquiryId);
  if (!quote) throw new NotFoundError("Souvenir quote not found for this enquiry");
  if (quote.status !== "DRAFT") throw new ConflictError("Reference media can only be added to a draft quote");

  const uploadedAssets = [];
  try {
    for (const file of files) {
      const uploaded = await uploadMedia({
        buffer: file.buffer,
        mimeType: file.mimetype,
        folder: "keplex/souvenirs/quotes",
      });
      uploadedAssets.push({
        quoteId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        mimeType: file.mimetype,
        bytes: uploaded.bytes,
        originalName: file.originalname?.slice(0, 255) ?? null,
      });
    }
    await souvenirDb.createSouvenirQuoteMedia(uploadedAssets);
    return souvenirDb.findSouvenirQuoteByIdAndEnquiry(quoteId, enquiryId);
  } catch (error) {
    await Promise.all(uploadedAssets.map((asset) =>
      deleteMedia({ publicId: asset.publicId, resourceType: asset.resourceType }).catch(() => {})
    ));
    throw error;
  }
};

export const sendAdminSouvenirQuote = async (enquiryId, quoteId) => {
  return prisma.$transaction(async (tx) => {
    const enquiry = await souvenirDb.findSouvenirEnquiryById(enquiryId, tx);
    if (!enquiry) throw new NotFoundError("Souvenir enquiry not found");
    const quote = await souvenirDb.findSouvenirQuoteByIdAndEnquiry(quoteId, enquiryId, tx);
    if (!quote) throw new NotFoundError("Souvenir quote not found for this enquiry");
    if (quote.status !== "DRAFT") throw new ConflictError("Only a draft quote can be sent");
    if (!quote.items.length) throw new BadRequestError("A quote must contain at least one priced item");
    if (!quoteAllowedEnquiryStatuses.includes(enquiry.status)) {
      throw new ConflictError("This enquiry can no longer receive a quote");
    }
    if (quote.expiresAt && quote.expiresAt <= new Date()) {
      throw new ConflictError("This quote has expired; create a new quote with a future expiry");
    }

    await souvenirDb.updateSouvenirQuotes(
      { enquiryId, status: "SENT" },
      { status: "SUPERSEDED" },
      tx,
    );
    const sent = await souvenirDb.updateSouvenirQuote(quoteId, {
      status: "SENT",
      sentAt: new Date(),
    }, tx);
    await souvenirDb.updateSouvenirEnquiry(enquiryId, {
      status: "RESPONDED",
      responseMessage: quote.message ?? enquiry.responseMessage,
      respondedAt: new Date(),
    }, tx);
    return quotePublicView(sent);
  });
};

export const respondToSouvenirQuote = async (token, { quoteId, decision }) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const enquiry = await souvenirDb.findEnquiryByTokenHash(tokenHash);
  if (!enquiry) throw new NotFoundError("Souvenir enquiry not found");

  const result = await prisma.$transaction(async (tx) => {
    const currentEnquiry = await souvenirDb.findEnquiryByTokenHash(tokenHash, tx);
    if (!currentEnquiry) throw new NotFoundError("Souvenir enquiry not found");
    const quote = await souvenirDb.findSouvenirQuoteByIdAndEnquiry(quoteId, currentEnquiry.id, tx);
    if (!quote) throw new NotFoundError("Souvenir quote not found");
    if (quote.status !== "SENT") {
      throw new ConflictError("Only the current sent quotation can be accepted or declined");
    }
    if (quote.expiresAt && quote.expiresAt <= new Date()) {
      await souvenirDb.updateSouvenirQuote(quote.id, { status: "EXPIRED" }, tx);
      return { expired: true };
    }

    const status = decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    const updatedQuote = await souvenirDb.updateSouvenirQuote(quote.id, {
      status,
      respondedAt: new Date(),
    }, tx);
    await souvenirDb.updateSouvenirEnquiryStatus(currentEnquiry.id, status, tx);
    return { expired: false, quote: quotePublicView(updatedQuote), enquiryStatus: status };
  });

  if (result.expired) throw new ConflictError("This quotation has expired");
  return result;
};
