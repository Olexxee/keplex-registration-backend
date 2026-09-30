import express from "express";
import * as controller from "./trainingProgram.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import {
  createTrainingProgramSchema,
  updateTrainingProgramSchema,
} from "./trainingProgram.validation.js";

const trainingRouter = express.Router();

// ============================================================
// PUBLIC
// ============================================================

trainingRouter.get(
  "/",
  controller.getPublicTrainingPrograms,
);

trainingRouter.get(
  "/slug/:slug",
  controller.getTrainingProgramBySlug,
);

trainingRouter.get(
  "/:id",
  controller.getTrainingProgramById,
);

// ============================================================
// ADMIN
// ============================================================

trainingRouter.get(
  "/admin/all",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.getAdminTrainingPrograms,
);

trainingRouter.post(
  "/admin",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(createTrainingProgramSchema),
  controller.createTrainingProgram,
);

trainingRouter.patch(
  "/admin/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(updateTrainingProgramSchema),
  controller.updateTrainingProgram,
);

trainingRouter.patch(
  "/admin/:id/status",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.toggleTrainingProgramStatus,
);

trainingRouter.patch(
  "/admin/:id/featured",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.toggleTrainingProgramFeatured,
);

trainingRouter.delete(
  "/admin/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.deleteTrainingProgram,
);

export default trainingRouter;