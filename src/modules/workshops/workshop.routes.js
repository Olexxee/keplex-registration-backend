import express from "express";
import * as controller from "./workshop.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validateMiddleware.js";
import {
  createOfferingSchema,
  updateOfferingSchema,
  createParticipantTierSchema,
  updateParticipantTierSchema,
  createBookingSchema,
  updateBookingSchema,
  setActiveSchema,
  idParamsSchema,
  tierParamsSchema,
  offeringParamsSchema,
  paginationQuerySchema,
} from "./workshop.validation.js";

const router = express.Router();
const admin = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];

router.get("/", controller.getPublicOfferings);
router.post("/bookings", validateBody(createBookingSchema), controller.createGuestBooking);

router.get("/admin/bookings", ...admin, validateQuery(paginationQuerySchema), controller.listAdminBookings);
router.patch("/admin/bookings/:id", ...admin, validateParams(idParamsSchema), validateBody(updateBookingSchema), controller.updateAdminBooking);

router.post("/admin/offerings", ...admin, validateBody(createOfferingSchema), controller.createAdminOffering);
router.patch("/admin/offerings/:id", ...admin, validateParams(idParamsSchema), validateBody(updateOfferingSchema), controller.updateAdminOffering);
router.patch("/admin/offerings/:id/status", ...admin, validateParams(idParamsSchema), validateBody(setActiveSchema), controller.setAdminOfferingActive);

router.post("/admin/offerings/:offeringId/tiers", ...admin, validateParams(offeringParamsSchema), validateBody(createParticipantTierSchema), controller.createAdminParticipantTier);
router.patch("/admin/tiers/:tierId", ...admin, validateParams(tierParamsSchema), validateBody(updateParticipantTierSchema), controller.updateAdminParticipantTier);
router.patch("/admin/tiers/:tierId/status", ...admin, validateParams(tierParamsSchema), validateBody(setActiveSchema), controller.setAdminParticipantTierActive);

export default router;
