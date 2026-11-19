import slugify from "slugify";
import { prisma } from "../../config/prisma.js";
import * as souvenirDb from "./souvenir.db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import crypto from "node:crypto";
import { uploadMedia, deleteMedia } from "../../lib/cloudinaryMedia.js";
import * as paymentService from "../payment/payment.service.js";
import { calculateSouvenirPrice, findMatchingPriceTier } from "./souvenir.pricing.js";
import { validateSelectedColors } from "./souvenir.colors.js";
import { buildPricingBands, formatPriceBandLabel, isValidCurrentSchedule } from "./souvenir.schedule.js";



const enqueueSouvenirEmail = (tx, dedupeKey, payload) => tx.emailOutbox.createMany({
  data: [{ type: "SOUVENIR_NOTIFICATION", dedupeKey, payload }],
  skipDuplicates: true,
});

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

const requireProduct = async (id, tx = prisma) => {
  const product = await souvenirDb.findProductById(id, tx);
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

export const setProductActive = async (id, active) => prisma.$transaction(async (tx) => {
  await lockSouvenirPriceTiers(tx, id);
  const product = await requireProduct(id, tx);
  if (active && product.archivedAt) {
    throw new ConflictError("Restore this archived package before publishing it");
  }
  if (active) {
    const bands = await souvenirDb.listCurrentPriceTiers(id, product.pricingVersion, tx);
    if (!isValidCurrentSchedule(bands, product.pricingVersion)) {
      throw new ConflictError("Configure and save a complete valid pricing schedule before publishing this souvenir");
    }
  }
  return souvenirDb.updateProduct(id, { active }, tx);
});

export const archiveProduct = async (id) => {
  await requireProduct(id);
  return souvenirDb.updateProduct(id, { active: false, archivedAt: new Date() });
};

export const restoreProduct = async (id) => {
  await requireProduct(id);
  return souvenirDb.updateProduct(id, { active: false, archivedAt: null });
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


const lockSouvenirPriceTiers = async (tx, productId) => {
  // Serializes all tier mutations for one product, including overlap checks and writes.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`souvenir-price-tiers:${productId}`}))`;
};

const serializePricingSchedule = (product, bands) => ({
  productId: product.id,
  productName: product.name,
  version: product.pricingVersion,
  isValid: isValidCurrentSchedule(bands, product.pricingVersion),
  isPublished: product.active,
  bands: bands.map((band) => ({
    id: band.id,
    version: band.version,
    minQuantity: band.minQuantity,
    maxQuantity: band.maxQuantity,
    label: formatPriceBandLabel(band),
    unitPrice: band.unitPrice,
    currency: band.currency,
  })),
});

export const getPricingSchedule = async (productId) => {
  const result = await souvenirDb.getCurrentPricingSchedule(productId);
  if (!result) throw new NotFoundError("Souvenir product not found");
  return serializePricingSchedule(result.product, result.bands);
};

export const replacePricingSchedule = async (productId, data) => prisma.$transaction(async (tx) => {
  await lockSouvenirPriceTiers(tx, productId);
  const product = await requireProduct(productId, tx);
  if (data.expectedVersion !== product.pricingVersion) {
    throw new ConflictError(`Pricing schedule changed since it was loaded. Expected version ${data.expectedVersion}; current version is ${product.pricingVersion}. Reload before saving.`);
  }

  let bands;
  try {
    bands = buildPricingBands(data.bands);
  } catch (error) {
    throw new BadRequestError(error.message);
  }

  const nextVersion = product.pricingVersion + 1;
  if (!Number.isSafeInteger(nextVersion)) {
    throw new ConflictError("Pricing schedule version is exhausted");
  }

  // The exclusion constraint applies only to current rows. Archive the complete
  // old version before inserting the replacement, within this same transaction.
  await souvenirDb.archiveCurrentPriceBands(productId, tx);
  await souvenirDb.updateProductPricingVersion(productId, nextVersion, tx);
  await souvenirDb.createCurrentPriceBands(productId, nextVersion, bands, tx);

  const saved = await souvenirDb.getCurrentPricingSchedule(productId, tx);
  if (!saved || !isValidCurrentSchedule(saved.bands, nextVersion)) {
    throw new ConflictError("The resulting pricing schedule failed integrity validation");
  }
  return serializePricingSchedule(saved.product, saved.bands);
});

const legacyTierMutationError = () => {
  throw new ConflictError("Individual price-tier mutations are retired. Read and replace the complete product pricing schedule instead.");
};

export const createPriceTier = async () => legacyTierMutationError();
export const updatePriceTier = async () => legacyTierMutationError();
export const setPriceTierActive = async () => legacyTierMutationError();
export const deletePriceTier = async () => legacyTierMutationError();

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
  // Avoid loading the full admin catalogue (media, colour options and price tiers)
  // for an upload existence check. This keeps the pre-upload DB operation small.
  await souvenirDb.findProductIdById(productId).then((product) => {
    if (!product) throw new NotFoundError("Souvenir product not found");
  });
  if (!files.length) throw new BadRequestError("Select at least one package reference image");
  if (files.length > 10) throw new BadRequestError("A maximum of 10 package images can be uploaded at once");
  if (files.some((file) => !file.mimetype?.startsWith("image/"))) {
    throw new BadRequestError("Package reference media must be image files");
  }

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
        resourceType: uploaded.resourceType ?? "image",
        altText: file.originalname?.slice(0, 300) ?? null,
        isPrimary: false,
        sortOrder: uploadedAssets.length,
      });
    }

    return await prisma.$transaction(async (tx) => {
      const created = [];
      for (const asset of uploadedAssets) {
        const { resourceType: _resourceType, ...mediaData } = asset;
        created.push(await souvenirDb.createProductMedia(mediaData, tx));
      }
      const currentPrimary = await souvenirDb.findPrimaryProductMedia(productId, tx);
      if (!currentPrimary && created.length) {
        await souvenirDb.clearPrimaryProductMedia(productId, tx);
        created[0] = await souvenirDb.updateProductMedia(created[0].id, { isPrimary: true }, tx);
      }
      return created;
    });
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

export const deleteProductMedia = async (mediaId) => {
  const existing = await souvenirDb.findProductMediaById(mediaId);
  if (!existing) throw new NotFoundError("Souvenir product image not found");

  const result = await deleteMedia({ publicId: existing.publicId, resourceType: "image" });
  if (result?.result && !["ok", "not found"].includes(result.result)) {
    throw new ConflictError("The image could not be removed from media storage. The catalogue record was kept.");
  }

  return prisma.$transaction(async (tx) => {
    await souvenirDb.deleteProductMedia(mediaId, tx);
    let promotedMediaId = null;
    if (existing.isPrimary) {
      const next = await souvenirDb.findNextProductMedia(existing.productId, mediaId, tx);
      if (next) {
        await souvenirDb.clearPrimaryProductMedia(existing.productId, tx);
        await souvenirDb.updateProductMedia(next.id, { isPrimary: true }, tx);
        promotedMediaId = next.id;
      }
    }
    return { id: mediaId, deleted: true, promotedMediaId };
  });
};

export const deleteProduct = async (productId) => {
  const product = await requireProduct(productId);
  if (!product.archivedAt || product.active) {
    throw new ConflictError("Archive this package before permanently deleting it");
  }

  const orderCount = await souvenirDb.countOrdersForProduct(productId);
  if (orderCount > 0) {
    throw new ConflictError("This package has order history and cannot be permanently deleted. It will remain archived.");
  }

  const assets = [
    ...(product.media ?? []).map((media) => media.publicId),
    ...(product.colorOptions ?? []).map((color) => color.swatchPublicId).filter(Boolean),
  ];
  for (const publicId of [...new Set(assets)]) {
    const result = await deleteMedia({ publicId, resourceType: "image" });
    if (result?.result && !["ok", "not found"].includes(result.result)) {
      throw new ConflictError("A package image could not be removed from media storage. The package was not deleted.");
    }
  }

  await souvenirDb.deleteProduct(productId);
  return { id: productId, deleted: true };
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
    // Serialize order creation with tier edits/deletion so a tier cannot be
    // removed between matching it and persisting its historical order reference.
    await lockSouvenirPriceTiers(tx, data.productId);
    // Read the product, active tier, and active colours inside the same transaction
    // used to persist the immutable order snapshots.
    const product = await souvenirDb.findActiveProductForOrder(data.productId, tx);
    if (!product) throw new NotFoundError("Souvenir package is unavailable");

    const currentBands = product.priceTiers.filter((band) => band.version === product.pricingVersion);
    if (!isValidCurrentSchedule(currentBands, product.pricingVersion)) {
      throw new ConflictError("This souvenir does not have a valid current pricing schedule");
    }
    const tier = findMatchingPriceTier(currentBands, data.quantity);
    if (!tier) {
      throw new BadRequestError("The selected quantity does not match an available price package");
    }
    if (tier.currency !== "NGN") {
      throw new BadRequestError("Only NGN souvenir orders are currently supported");
    }

    const colorSnapshots = validateSelectedColors(data.colorSelections);
    let pricing;
    try {
      pricing = calculateSouvenirPrice(tier.unitPrice, data.quantity);
    } catch (error) {
      throw new BadRequestError(error.message);
    }
    const { unitPriceSnapshot, totalPriceSnapshot } = pricing;
    const created = await souvenirDb.createSouvenirOrder({
      publicReference,
      accessTokenHash,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerWhatsApp: data.customerWhatsApp,
      productId: product.id,
      priceTierId: tier.id,
      productNameSnapshot: product.name,
      priceTierLabelSnapshot: formatPriceBandLabel(tier),
      priceTierVersionSnapshot: tier.version,
      priceTierMinQuantitySnapshot: tier.minQuantity,
      priceTierMaxQuantitySnapshot: tier.maxQuantity,
      quantity: data.quantity,
      unitPriceSnapshot,
      totalPriceSnapshot,
      currency: tier.currency,
      bookingTermsSnapshot: product.bookingTerms,
      productionLeadTimeDaysSnapshot: product.productionLeadTimeDays,
      customerNotes: data.customerNotes ?? null,
      status: "SUBMITTED",
    }, tx);

    await souvenirDb.createSouvenirOrderColors(created.id, colorSnapshots, tx);
    await enqueueSouvenirEmail(tx, `souvenir-order-submitted:${created.id}`, {
      notificationType: "ORDER_SUBMITTED",
      name: created.customerName,
      email: created.customerEmail,
      publicReference: created.publicReference,
      productName: created.productNameSnapshot,
      quantity: created.quantity,
      totalPrice: created.totalPriceSnapshot.toString(),
      currency: created.currency,
      accessUrl: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/souvenirs/orders/access/${accessToken}`
        : null,
    });

    return souvenirDb.findSouvenirOrderById(created.id, tx);
  });

  let payment = null;
  let paymentError = null;
  try {
    payment = await paymentService.initializeSouvenirPayment({ orderId: order.id, accessToken });
  } catch {
    paymentError = "Secure checkout could not be initialized. Keep your private order link and retry payment shortly.";
  }

  return {
    payment,
    paymentError,
    order: {
      publicReference: order.publicReference,
      productName: order.productNameSnapshot,
      quantity: order.quantity,
      unitPrice: order.unitPriceSnapshot,
      totalPrice: order.totalPriceSnapshot,
      currency: order.currency,
      status: payment ? "AWAITING_PAYMENT" : order.status,
      colorSelections: order.colorSelections,
    },
    accessToken,
    accessUrlPath: `/api/souvenirs/orders/access/${accessToken}`,
  };
};

export const retryGuestSouvenirPayment = async (token) => {
  const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const order = await souvenirDb.findOrderByTokenHash(accessTokenHash);
  if (!order) throw new NotFoundError("Souvenir order not found");
  if (order.status === "PAID" || order.status === "IN_PRODUCTION" || order.status === "READY" || order.status === "FULFILLED") {
    throw new ConflictError("This souvenir order has already been paid or is being fulfilled");
  }
  return paymentService.initializeSouvenirPayment({ orderId: order.id, accessToken: token });
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
    unitPrice: order.unitPriceSnapshot,
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

export const updateAdminSouvenirOrder = async (id, data) => prisma.$transaction(async (tx) => {
  const existing = await souvenirDb.findSouvenirOrderById(id, tx);
  if (!existing) throw new NotFoundError("Souvenir order not found");
  if (data.status && data.status !== existing.status && !allowedOrderTransitions[existing.status].includes(data.status)) {
    throw new ConflictError(`Cannot change a souvenir order from ${existing.status} to ${data.status}`);
  }
  const updated = await souvenirDb.updateSouvenirOrder(id, {
    ...(data.status ? { status: data.status } : {}),
    ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
  }, tx);
  if (data.status && data.status !== existing.status) {
    await enqueueSouvenirEmail(tx, `souvenir-order-status:${updated.id}:${updated.updatedAt.getTime()}`, {
      notificationType: "ORDER_STATUS_UPDATED",
      name: updated.customerName,
      email: updated.customerEmail,
      publicReference: updated.publicReference,
      productName: updated.productNameSnapshot,
      quantity: updated.quantity,
      totalPrice: updated.totalPriceSnapshot.toString(),
      currency: updated.currency,
      previousStatus: existing.status,
      newStatus: updated.status,
    });
  }
  return stripOrderSecrets(updated);
});

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
      await enqueueSouvenirEmail(tx, `souvenir-enquiry-submitted:${created.id}`, {
        notificationType: "ENQUIRY_SUBMITTED",
        name: created.customerName,
        email: created.customerEmail,
        publicReference: created.publicReference,
        productName: created.product?.name ?? "Custom souvenir",
        requestedQuantity: created.requestedQuantity,
        accessUrl: process.env.FRONTEND_URL
          ? `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/souvenirs/enquiries/access/${accessToken}`
          : null,
      });
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

const GUEST_ENQUIRY_CODE_TTL_MS = 5 * 60 * 1000;
const GUEST_ENQUIRY_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const hashGuestAccessValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const requestGuestSouvenirEnquiryAccessCode = async ({ reference }) => {
  const challengeToken = crypto.randomBytes(32).toString("hex");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const enquiry = await souvenirDb.findEnquiryForGuestAccessRequest(reference);
  if (enquiry) {
    const expiresAt = new Date(Date.now() + GUEST_ENQUIRY_CODE_TTL_MS);
    await souvenirDb.createSouvenirGuestAccessChallenge({
      enquiryId: enquiry.id,
      challengeTokenHash: hashGuestAccessValue(challengeToken),
      codeHash: hashGuestAccessValue(`${challengeToken}:${code}`),
      expiresAt,
      emailPayload: {
        notificationType: "GUEST_ACCESS_CODE",
        name: enquiry.customerName,
        email: enquiry.customerEmail,
        publicReference: enquiry.publicReference,
        code,
        expiresInMinutes: 5,
      },
    });
  }
  return {
    challengeToken,
    expiresInSeconds: GUEST_ENQUIRY_CODE_TTL_MS / 1000,
    message: "If the enquiry reference is valid, a verification code has been sent to its registered email address.",
  };
};

export const verifyGuestSouvenirEnquiryAccessCode = async ({ reference, challengeToken, code }) => {
  const challenge = await souvenirDb.findSouvenirGuestAccessChallenge(reference, hashGuestAccessValue(challengeToken));
  if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) {
    throw new BadRequestError("The verification code is invalid or has expired. Request a new code.");
  }
  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(hashGuestAccessValue(`${challengeToken}:${code}`), "hex");
  const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!valid) {
    await souvenirDb.incrementSouvenirGuestAccessChallengeAttempts(challenge.id);
    throw new BadRequestError("The verification code is invalid or has expired. Request a new code.");
  }
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + GUEST_ENQUIRY_SESSION_TTL_MS);
  const created = await souvenirDb.consumeSouvenirGuestAccessChallengeAndCreateSession({
    challengeId: challenge.id,
    enquiryId: challenge.enquiryId,
    tokenHash: hashGuestAccessValue(sessionToken),
    expiresAt,
  });
  if (!created) throw new BadRequestError("The verification code is invalid or has expired. Request a new code.");
  return {
    accessToken: sessionToken,
    expiresAt,
    accessUrlPath: `/souvenirs/enquiries/access/${encodeURIComponent(reference)}/${sessionToken}`,
  };
};

export const getGuestSouvenirEnquiryByCredentials = async ({ reference, token }) => {
  const enquiry = await souvenirDb.findSouvenirEnquiryByCredentials(reference, hashGuestAccessValue(token));
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
        id: quote.id, version: quote.version, status: quote.status, currency: quote.currency,
        totalAmount: quote.totalAmount, terms: quote.terms, message: quote.message,
        expiresAt: quote.expiresAt, sentAt: quote.sentAt, respondedAt: quote.respondedAt,
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

export const updateAdminSouvenirEnquiry = async (id, data) => prisma.$transaction(async (tx) => {
  const existing = await souvenirDb.findSouvenirEnquiryById(id, tx);
  if (!existing) throw new NotFoundError("Souvenir enquiry not found");
  const update = { ...data };
  if (data.status === "RESPONDED" || data.responseMessage) {
    update.status = data.status ?? "RESPONDED";
    update.respondedAt = new Date();
  }
  const updated = await souvenirDb.updateSouvenirEnquiry(id, update, tx);
  const statusChanged = updated.status !== existing.status;
  const responseChanged = data.responseMessage !== undefined && data.responseMessage !== existing.responseMessage;
  if (statusChanged || responseChanged) {
    await enqueueSouvenirEmail(tx, `souvenir-enquiry-update:${updated.id}:${updated.updatedAt.getTime()}`, {
      notificationType: "ENQUIRY_STATUS_UPDATED",
      name: updated.customerName,
      email: updated.customerEmail,
      publicReference: updated.publicReference,
      productName: updated.product?.name ?? "Custom souvenir",
      previousStatus: existing.status,
      newStatus: updated.status,
      customerMessage: updated.responseMessage ?? null,
    });
  }
  return stripEnquirySecrets(updated);
});


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
    await enqueueSouvenirEmail(tx, `souvenir-quote-sent:${sent.id}`, {
      notificationType: "QUOTE_SENT",
      name: enquiry.customerName,
      email: enquiry.customerEmail,
      publicReference: enquiry.publicReference,
      productName: enquiry.product?.name ?? "Custom souvenir",
      quoteVersion: sent.version,
      quoteTotal: sent.totalAmount.toString(),
      currency: sent.currency,
      quoteMessage: sent.message ?? null,
      quoteTerms: sent.terms ?? null,
      quoteExpiresAt: sent.expiresAt?.toISOString() ?? null,
      quoteItems: sent.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice.toString(), lineTotal: item.lineTotal.toString() })),
    });
    return quotePublicView(sent);
  });
};

export const respondToSouvenirQuote = async (token, { quoteId, decision }, reference = null) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const enquiry = reference
    ? await souvenirDb.findSouvenirEnquiryByCredentials(reference, tokenHash)
    : await souvenirDb.findEnquiryByTokenHash(tokenHash);
  if (!enquiry) throw new NotFoundError("Souvenir enquiry not found");

  const result = await prisma.$transaction(async (tx) => {
    const currentEnquiry = reference
      ? await souvenirDb.findSouvenirEnquiryByCredentials(reference, tokenHash, tx)
      : await souvenirDb.findEnquiryByTokenHash(tokenHash, tx);
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
    await enqueueSouvenirEmail(tx, `souvenir-quote-response:${updatedQuote.id}:${status}`, {
      notificationType: status === "ACCEPTED" ? "QUOTE_ACCEPTED" : "QUOTE_DECLINED",
      name: currentEnquiry.customerName,
      email: currentEnquiry.customerEmail,
      publicReference: currentEnquiry.publicReference,
      productName: currentEnquiry.product?.name ?? "Custom souvenir",
      quoteVersion: updatedQuote.version,
      quoteTotal: updatedQuote.totalAmount.toString(),
      currency: updatedQuote.currency,
    });
    return { expired: false, quote: quotePublicView(updatedQuote), enquiryStatus: status };
  });

  if (result.expired) throw new ConflictError("This quotation has expired");
  return result;
};
