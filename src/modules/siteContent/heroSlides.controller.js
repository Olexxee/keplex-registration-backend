import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as service from "./siteContent.service.js";

export const getPublicHeroSlides = asyncWrapper(async (_req, res) => {
  const data = await service.getPublicHeroSlides();
  return res.json({ success: true, message: "Homepage slides retrieved", data });
});
