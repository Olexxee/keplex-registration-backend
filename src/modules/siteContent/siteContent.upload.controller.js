import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { uploadImageAsset, uploadPdfAsset } from "./siteContent.upload.js";

export const uploadGalleryImage = asyncWrapper(async (req, res) => {
  const asset = await uploadImageAsset(req.file, "kpx/gallery");
  return res.status(201).json({ success: true, message: "Gallery image uploaded", data: asset });
});
export const uploadHeroImage = asyncWrapper(async (req, res) => {
  const asset = await uploadImageAsset(req.file, "kpx/hero");
  return res.status(201).json({ success: true, message: "Hero image uploaded", data: asset });
});
export const uploadResourceFile = asyncWrapper(async (req, res) => {
  const asset = await uploadPdfAsset(req.file);
  return res.status(201).json({ success: true, message: "PDF resource uploaded", data: asset });
});
