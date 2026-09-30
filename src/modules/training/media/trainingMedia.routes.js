import express from "express";
import * as controller from "./trainingMedia.controller.js";
// import { asyncWrapper } from "../../../lib/asyncWrapper.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../../middlewares/roleMiddleware.js";
import { uploadSingleMedia } from "../../../middlewares/uploadMiddleware.js";
import { validateBody } from "../../../middlewares/validateMiddleware.js";
import {
  reorderTrainingMediaSchema,
  uploadTrainingMediaSchema,
} from "./trainingMedia.validation.js";


const trainingMediaRouter = express.Router();

// Public
trainingMediaRouter.get(
  "/:trainingProgramId/media",
  controller.getTrainingMedia,
);

// Admin
trainingMediaRouter.post(
  "/:trainingProgramId/media",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  uploadSingleMedia,
  validateBody(uploadTrainingMediaSchema),
  controller.uploadTrainingMedia,
);

trainingMediaRouter.patch(
  "/:trainingProgramId/media/:mediaId/primary",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.setPrimaryTrainingMedia,
);

trainingMediaRouter.patch(
  "/:trainingProgramId/media/:mediaId/order",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  validateBody(reorderTrainingMediaSchema),
  controller.reorderTrainingMedia,
);

trainingMediaRouter.delete(
  "/:trainingProgramId/media/:mediaId",
  authMiddleware,
  roleMiddleware("ADMIN", "SUPER_ADMIN"),
  controller.deleteTrainingMedia,
);

export default trainingMediaRouter;