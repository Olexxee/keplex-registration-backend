import express from "express";
import * as controller from "./souvenir.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { uploadMultipleReferenceMedia } from "../../middlewares/uploadMiddleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validateMiddleware.js";
import {
  createProductSchema,
  updateProductSchema,
  createColorOptionSchema,
  updateColorOptionSchema,
  setActiveSchema,
  createPriceTierSchema,
  updatePriceTierSchema,
  createProductMediaSchema,
  updateProductMediaSchema,
  createSouvenirOrderSchema,
  createSouvenirEnquirySchema,
  accessTokenParamsSchema,
  paginationQuerySchema,
  orderStatusSchema,
  enquiryAdminUpdateSchema,
  quoteRouteParamsSchema,
  createSouvenirQuoteSchema,
  souvenirQuoteResponseSchema,
  idParamsSchema,
  slugParamsSchema,
  colorIdParamsSchema,
  tierIdParamsSchema,
  mediaIdParamsSchema,
} from "./souvenir.validation.js";

const router = express.Router();
const admin = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];

// Guest order and custom-design enquiry routes.
router.post("/orders", validateBody(createSouvenirOrderSchema), controller.createGuestSouvenirOrder);
router.get("/orders/access/:token", validateParams(accessTokenParamsSchema), controller.getGuestSouvenirOrder);
router.post("/enquiries", uploadMultipleReferenceMedia, validateBody(createSouvenirEnquirySchema), controller.createGuestSouvenirEnquiry);
router.get("/enquiries/access/:token", validateParams(accessTokenParamsSchema), controller.getGuestSouvenirEnquiry);
router.post("/enquiries/access/:token/quote-response", validateParams(accessTokenParamsSchema), validateBody(souvenirQuoteResponseSchema), controller.respondToSouvenirQuote);

// Admin transaction handling. These static routes must precede /:slug.
router.get("/admin/orders", ...admin, validateQuery(paginationQuerySchema), controller.listAdminSouvenirOrders);
router.get("/admin/orders/:id", ...admin, validateParams(idParamsSchema), controller.getAdminSouvenirOrder);
router.patch("/admin/orders/:id", ...admin, validateParams(idParamsSchema), validateBody(orderStatusSchema), controller.updateAdminSouvenirOrder);

router.get("/admin/enquiries", ...admin, validateQuery(paginationQuerySchema), controller.listAdminSouvenirEnquiries);
router.get("/admin/enquiries/:id", ...admin, validateParams(idParamsSchema), controller.getAdminSouvenirEnquiry);
router.patch("/admin/enquiries/:id", ...admin, validateParams(idParamsSchema), validateBody(enquiryAdminUpdateSchema), controller.updateAdminSouvenirEnquiry);
router.post("/admin/enquiries/:id/quotes", ...admin, validateParams(idParamsSchema), validateBody(createSouvenirQuoteSchema), controller.createAdminSouvenirQuote);
router.post("/admin/enquiries/:id/quotes/:quoteId/media", ...admin, validateParams(quoteRouteParamsSchema), uploadMultipleReferenceMedia, controller.addAdminSouvenirQuoteMedia);
router.post("/admin/enquiries/:id/quotes/:quoteId/send", ...admin, validateParams(quoteRouteParamsSchema), controller.sendAdminSouvenirQuote);

// Admin catalogue management.
router.get("/admin/products", ...admin, controller.getAdminProducts);
router.post("/admin/products", ...admin, validateBody(createProductSchema), controller.createProduct);
router.patch("/admin/products/:id", ...admin, validateParams(idParamsSchema), validateBody(updateProductSchema), controller.updateProduct);
router.patch("/admin/products/:id/status", ...admin, validateParams(idParamsSchema), validateBody(setActiveSchema), controller.setProductActive);

router.post("/admin/products/:id/colors", ...admin, validateParams(idParamsSchema), validateBody(createColorOptionSchema), controller.createColorOption);
router.patch("/admin/colors/:colorId", ...admin, validateParams(colorIdParamsSchema), validateBody(updateColorOptionSchema), controller.updateColorOption);
router.patch("/admin/colors/:colorId/status", ...admin, validateParams(colorIdParamsSchema), validateBody(setActiveSchema), controller.setColorOptionActive);

router.post("/admin/products/:id/price-tiers", ...admin, validateParams(idParamsSchema), validateBody(createPriceTierSchema), controller.createPriceTier);
router.patch("/admin/price-tiers/:tierId", ...admin, validateParams(tierIdParamsSchema), validateBody(updatePriceTierSchema), controller.updatePriceTier);
router.patch("/admin/price-tiers/:tierId/status", ...admin, validateParams(tierIdParamsSchema), validateBody(setActiveSchema), controller.setPriceTierActive);

router.post("/admin/products/:id/media", ...admin, validateParams(idParamsSchema), validateBody(createProductMediaSchema), controller.createProductMedia);
router.patch("/admin/media/:mediaId", ...admin, validateParams(mediaIdParamsSchema), validateBody(updateProductMediaSchema), controller.updateProductMedia);

// Public catalogue. Dynamic slug route stays last to avoid catching static paths.
router.get("/", controller.getPublicProducts);
router.get("/:slug", validateParams(slugParamsSchema), controller.getPublicProductBySlug);

export default router;
