import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as service from "./siteContent.service.js";

export const getFounderProfile = asyncWrapper(async (_req, res) => {
  const data = await service.getFounderProfile();
  return res.json({ success: true, message: "Founder profile retrieved", data });
});

export const updateFounderProfile = asyncWrapper(async (req, res) => {
  const data = await service.updateFounderProfile(req.validated.body);
  return res.json({ success: true, message: "Founder profile updated", data });
});
