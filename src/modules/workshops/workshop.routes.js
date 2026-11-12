import express from "express";
import rateLimit from "express-rate-limit";
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
  guestBookingAccessParamsSchema,
  guestProposalResponseSchema,
  updateBookingSchema,
  setActiveSchema,
  idParamsSchema,
  tierParamsSchema,
  offeringParamsSchema,
  paginationQuerySchema,
  requestGuestBookingAccessCodeSchema,
  verifyGuestBookingAccessCodeSchema,
} from "./workshop.validation.js";

const router = express.Router();
const admin = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];
const guestAccessRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: "draft-8", legacyHeaders: false,
  message: { success: false, message: "Too many verification requests. Try again later." },
});
const guestAccessVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  message: { success: false, message: "Too many verification attempts. Try again later." },
});

router.get("/", controller.getPublicOfferings);
router.post("/bookings", validateBody(createBookingSchema), controller.createGuestBooking);
router.post("/bookings/track/request", guestAccessRequestLimiter, validateBody(requestGuestBookingAccessCodeSchema), controller.requestGuestBookingAccessCode);
router.post("/bookings/track/verify", guestAccessVerifyLimiter, validateBody(verifyGuestBookingAccessCodeSchema), controller.verifyGuestBookingAccessCode);
router.get("/bookings/access/:reference/:token", validateParams(guestBookingAccessParamsSchema), controller.getGuestBooking);
router.post("/bookings/access/:reference/:token/respond", validateParams(guestBookingAccessParamsSchema), validateBody(guestProposalResponseSchema), controller.respondToGuestProposal);

router.get("/admin/bookings", ...admin, validateQuery(paginationQuerySchema), controller.listAdminBookings);
router.patch("/admin/bookings/:id", ...admin, validateParams(idParamsSchema), validateBody(updateBookingSchema), controller.updateAdminBooking);

router.get("/admin/offerings", ...admin, controller.listAdminOfferings);
router.post("/admin/offerings", ...admin, validateBody(createOfferingSchema), controller.createAdminOffering);
router.patch("/admin/offerings/:id", ...admin, validateParams(idParamsSchema), validateBody(updateOfferingSchema), controller.updateAdminOffering);
router.patch("/admin/offerings/:id/status", ...admin, validateParams(idParamsSchema), validateBody(setActiveSchema), controller.setAdminOfferingActive);

router.post("/admin/offerings/:offeringId/tiers", ...admin, validateParams(offeringParamsSchema), validateBody(createParticipantTierSchema), controller.createAdminParticipantTier);
router.patch("/admin/tiers/:tierId", ...admin, validateParams(tierParamsSchema), validateBody(updateParticipantTierSchema), controller.updateAdminParticipantTier);
router.patch("/admin/tiers/:tierId/status", ...admin, validateParams(tierParamsSchema), validateBody(setActiveSchema), controller.setAdminParticipantTierActive);

export default router;
