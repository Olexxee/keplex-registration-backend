import express from "express";
import * as controller from "./siteContent.controller.js";
import * as uploadController from "./siteContent.upload.controller.js";
import { uploadSiteImage, uploadResourcePdf } from "./siteContent.upload.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validateMiddleware.js";
import { idParamsSchema, slugParamsSchema, heroSchema, categorySchema, galleryImageSchema, resourceSchema, statusSchema, galleryQuerySchema, resourceQuerySchema } from "./siteContent.validation.js";

const router = express.Router();
const admin = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];

// Public routes
router.get("/hero", controller.getPublicHero);
router.get("/gallery/categories", controller.getPublicCategories);
router.get("/gallery", validateQuery(galleryQuerySchema), controller.getPublicGallery);
router.get("/resources", validateQuery(resourceQuerySchema), controller.getPublicResources);
router.get("/resources/:slug", validateParams(slugParamsSchema), controller.getPublicResource);

// Admin hero drafts are versioned so edits never replace the live hero until publish.
router.get("/admin/hero", ...admin, controller.getAdminHeroes);
router.post("/admin/hero", ...admin, validateBody(heroSchema), controller.createHero);
router.patch("/admin/hero/:id", ...admin, validateParams(idParamsSchema), validateBody(heroSchema.partial()), controller.updateHero);
router.post("/admin/hero/:id/publish", ...admin, validateParams(idParamsSchema), controller.publishHero);

// Uploads use dedicated allowlists and size limits; PDFs use an explicit Cloudinary image asset type for PDF delivery.
router.post("/admin/uploads/hero-image", ...admin, uploadSiteImage, uploadController.uploadHeroImage);
router.post("/admin/uploads/gallery-image", ...admin, uploadSiteImage, uploadController.uploadGalleryImage);
router.post("/admin/uploads/resource-pdf", ...admin, uploadResourcePdf, uploadController.uploadResourceFile);

// Gallery categories and images
router.get("/admin/gallery/categories", ...admin, controller.getAdminCategories);
router.post("/admin/gallery/categories", ...admin, validateBody(categorySchema), controller.createCategory);
router.patch("/admin/gallery/categories/:id", ...admin, validateParams(idParamsSchema), validateBody(categorySchema.partial()), controller.updateCategory);
router.delete("/admin/gallery/categories/:id", ...admin, validateParams(idParamsSchema), controller.deleteCategory);
router.get("/admin/gallery", ...admin, controller.getAdminGallery);
router.post("/admin/gallery", ...admin, validateBody(galleryImageSchema), controller.createGalleryImage);
router.patch("/admin/gallery/:id", ...admin, validateParams(idParamsSchema), validateBody(galleryImageSchema.partial().extend({ status: statusSchema.shape.status.optional() })), controller.updateGalleryImage);
router.delete("/admin/gallery/:id", ...admin, validateParams(idParamsSchema), controller.deleteGalleryImage);

// Resources
router.get("/admin/resources", ...admin, controller.getAdminResources);
router.post("/admin/resources", ...admin, validateBody(resourceSchema), controller.createResource);
router.patch("/admin/resources/:id", ...admin, validateParams(idParamsSchema), validateBody(resourceSchema.partial().extend({ status: statusSchema.shape.status.optional() })), controller.updateResource);
router.delete("/admin/resources/:id", ...admin, validateParams(idParamsSchema), controller.deleteResource);

export default router;
