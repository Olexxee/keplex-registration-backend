import express from "express";

import * as testimonialController from "./testimonial.controller.js";

import {
  createTestimonialSchema,
  listTestimonialsQuerySchema,
  testimonialIdSchema,
  updateTestimonialStatusSchema,
} from "./testimonial.validation.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const testimonialRouter = express.Router();

const adminAccess = [
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
];

// ────────────────────────────────────────────────────────────
// PUBLIC
// ────────────────────────────────────────────────────────────

testimonialRouter.get(
  "/",
  testimonialController.getPublicTestimonials,
);

testimonialRouter.post(
  "/",
  validateBody(createTestimonialSchema),
  testimonialController.createTestimonial,
);

// ────────────────────────────────────────────────────────────
// ADMIN
// ────────────────────────────────────────────────────────────

testimonialRouter.get(
  "/admin",
  ...adminAccess,
  validateQuery(listTestimonialsQuerySchema),
  testimonialController.listTestimonials,
);

testimonialRouter.get(
  "/admin/stats",
  ...adminAccess,
  testimonialController.getTestimonialStats,
);

testimonialRouter.patch(
  "/admin/:id/status",
  ...adminAccess,
  validateParams(testimonialIdSchema),
  validateBody(updateTestimonialStatusSchema),
  testimonialController.updateTestimonialStatus,
);

testimonialRouter.delete(
  "/admin/:id",
  ...adminAccess,
  validateParams(testimonialIdSchema),
  testimonialController.deleteTestimonial,
);

export default testimonialRouter;