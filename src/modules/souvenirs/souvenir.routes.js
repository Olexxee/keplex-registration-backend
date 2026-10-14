import express from "express";
import * as controller from "./souvenir.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateBody, validateParams } from "../../middlewares/validateMiddleware.js";
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
  idParamsSchema,
  slugParamsSchema,
  colorIdParamsSchema,
  tierIdParamsSchema,
  mediaIdParamsSchema,
} from "./souvenir.validation.js";

const router = express.Router();
const admin = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];

// Public catalogue: product details expose only active colours and price tiers.
router.get("/", controller.getPublicProducts);
router.get("/:slug", validateParams(slugParamsSchema), controller.getPublicProductBySlug);

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

export default router;
