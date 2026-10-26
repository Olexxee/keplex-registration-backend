import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as service from "./siteContent.service.js";

const ok = (res, message, data) =>
  res.status(200).json({ success: true, message, data });
export const getPublicHero = asyncWrapper(async (_req, res) =>
  ok(res, "Homepage hero retrieved", await service.getPublicHero()),
);
export const getAdminHeroes = asyncWrapper(async (_req, res) =>
  ok(res, "Homepage hero versions retrieved", await service.getAdminHeroes()),
);
export const createHero = asyncWrapper(async (req, res) =>
  res.status(201).json({ success: true, message: "Hero draft created", data: await service.createHero(req.validated.body) }),
);
export const updateHero = asyncWrapper(async (req, res) =>
  ok(res, "Hero draft updated", await service.updateHero(req.validated.params.id, req.validated.body)),
);
export const publishHero = asyncWrapper(async (req, res) =>
  ok(res, "Hero published", await service.publishHero(req.validated.params.id)),
);
export const getPublicCategories = asyncWrapper(async (_req, res) =>
  ok(res, "Gallery categories retrieved", await service.getPublicCategories()),
);
export const getAdminCategories = asyncWrapper(async (_req, res) =>
  ok(res, "Gallery categories retrieved", await service.getAdminCategories()),
);
export const createCategory = asyncWrapper(async (req, res) =>
  res.status(201).json({ success: true, message: "Gallery category created", data: await service.createCategory(req.validated.body) }),
);
export const updateCategory = asyncWrapper(async (req, res) =>
  ok(res, "Gallery category updated", await service.updateCategory(req.validated.params.id, req.validated.body)),
);
export const deleteCategory = asyncWrapper(async (req, res) =>
  ok(res, "Gallery category deleted", await service.deleteCategory(req.validated.params.id)),
);
export const getPublicGallery = asyncWrapper(async (req, res) =>
  ok(res, "Gallery retrieved", await service.getPublicGallery(req.validated.query)),
);
export const getAdminGallery = asyncWrapper(async (_req, res) =>
  ok(res, "Gallery images retrieved", await service.getAdminGallery()),
);
export const createGalleryImage = asyncWrapper(async (req, res) =>
  res.status(201).json({ success: true, message: "Gallery image created as draft", data: await service.createGalleryImage(req.validated.body) }),
);
export const updateGalleryImage = asyncWrapper(async (req, res) =>
  ok(res, "Gallery image updated", await service.updateGalleryImage(req.validated.params.id, req.validated.body)),
);
export const deleteGalleryImage = asyncWrapper(async (req, res) =>
  ok(res, "Gallery image deleted", await service.deleteGalleryImage(req.validated.params.id)),
);
export const getPublicResources = asyncWrapper(async (req, res) =>
  ok(res, "Resources retrieved", await service.getPublicResources(req.validated.query)),
);
export const getPublicResource = asyncWrapper(async (req, res) =>
  ok(res, "Resource retrieved", await service.getPublicResource(req.validated.params.slug)),
);
export const viewPublicResource = asyncWrapper(async (req, res) =>
  res.redirect(302, await service.getPublicResourceViewUrl(req.validated.params.slug)),
);
export const downloadPublicResource = asyncWrapper(async (req, res) =>
  res.redirect(302, await service.getPublicResourceDownloadUrl(req.validated.params.slug)),
);
export const getAdminResources = asyncWrapper(async (_req, res) =>
  ok(res, "Resources retrieved", await service.getAdminResources()),
);
export const createResource = asyncWrapper(async (req, res) =>
  res.status(201).json({ success: true, message: "Resource created as draft", data: await service.createResource(req.validated.body) }),
);
export const updateResource = asyncWrapper(async (req, res) =>
  ok(res, "Resource updated", await service.updateResource(req.validated.params.id, req.validated.body)),
);
export const deleteResource = asyncWrapper(async (req, res) =>
  ok(res, "Resource deleted", await service.deleteResource(req.validated.params.id)),
);
export const getSiteBranding = asyncWrapper(async (_req, res) =>
  ok(res, "Site branding retrieved", await service.getSiteBranding()),
);
export const updateSiteBranding = asyncWrapper(async (req, res) =>
  ok(res, "Site branding updated", await service.updateSiteBranding(req.validated.body)),
);
