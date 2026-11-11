import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as service from "./organizationProfile.service.js";

const ok = (res, message, data) =>
  res.status(200).json({ success: true, message, data });

export const getOrganizationProfile = asyncWrapper(async (_req, res) =>
  ok(res, "Organization profile retrieved", await service.getOrganizationProfile()),
);

export const updateOrganizationProfile = asyncWrapper(async (req, res) =>
  ok(res, "Organization profile updated", await service.updateOrganizationProfile(req.validated.body)),
);
