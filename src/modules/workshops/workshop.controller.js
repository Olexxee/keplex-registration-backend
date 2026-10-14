import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as workshopService from "./workshop.service.js";

export const getPublicOfferings = asyncWrapper(async (_req, res) => {
  const data = await workshopService.getPublicOfferings();
  return res.json({ success: true, data });
});

export const createGuestBooking = asyncWrapper(async (req, res) => {
  const data = await workshopService.createGuestBooking(req.validated.body);
  return res.status(201).json({
    success: true,
    message: "Creative workshop event request submitted",
    data,
  });
});

export const createAdminOffering = asyncWrapper(async (req, res) => {
  const data = await workshopService.createOffering(req.validated.body);
  return res.status(201).json({ success: true, data });
});

export const updateAdminOffering = asyncWrapper(async (req, res) => {
  const data = await workshopService.updateOffering(req.validated.params.id, req.validated.body);
  return res.json({ success: true, data });
});

export const setAdminOfferingActive = asyncWrapper(async (req, res) => {
  const data = await workshopService.setOfferingActive(req.validated.params.id, req.validated.body.active);
  return res.json({ success: true, data });
});

export const createAdminParticipantTier = asyncWrapper(async (req, res) => {
  const data = await workshopService.createParticipantTier(req.validated.params.offeringId, req.validated.body);
  return res.status(201).json({ success: true, data });
});

export const updateAdminParticipantTier = asyncWrapper(async (req, res) => {
  const data = await workshopService.updateParticipantTier(req.validated.params.tierId, req.validated.body);
  return res.json({ success: true, data });
});

export const setAdminParticipantTierActive = asyncWrapper(async (req, res) => {
  const data = await workshopService.setParticipantTierActive(req.validated.params.tierId, req.validated.body.active);
  return res.json({ success: true, data });
});

export const listAdminBookings = asyncWrapper(async (req, res) => {
  const data = await workshopService.listAdminBookings(req.validated.query);
  return res.json({ success: true, data });
});

export const updateAdminBooking = asyncWrapper(async (req, res) => {
  const data = await workshopService.updateAdminBooking(req.validated.params.id, req.validated.body);
  return res.json({ success: true, data });
});
