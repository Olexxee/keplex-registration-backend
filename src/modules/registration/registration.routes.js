import express from "express";

import * as registrationController from "./registration.controller.js";

import {
  createRegistrationSchema,
  listRegistrationsQuerySchema,
  registrationIdSchema,
  registrationReferenceSchema,
} from "./registration.validation.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";

const registrationRouter = express.Router();

const adminAccess = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];

// Public: create a registration.
registrationRouter.post(
  "/",
  validateBody(createRegistrationSchema),
  registrationController.createRegistration,
);

// Admin: list registrations.
registrationRouter.get(
  "/",
  ...adminAccess,
  validateQuery(listRegistrationsQuerySchema),
  registrationController.listRegistrations,
);

// Protected: a payment reference can reveal registration information.
registrationRouter.get(
  "/reference/:reference",
  ...adminAccess,
  validateParams(registrationReferenceSchema),
  registrationController.getRegistrationByReference,
);

// Admin: retrieve an individual registration.
registrationRouter.get(
  "/:id",
  ...adminAccess,
  validateParams(registrationIdSchema),
  registrationController.getRegistration,
);

// Admin: cancel a registration.
registrationRouter.patch(
  "/:id/cancel",
  ...adminAccess,
  validateParams(registrationIdSchema),
  registrationController.cancelRegistration,
);

export default registrationRouter;
