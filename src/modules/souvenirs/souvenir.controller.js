import * as souvenirService from "./souvenir.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";

export const getPublicProducts = asyncWrapper(async (_req, res) => {
  const data = await souvenirService.getPublicProducts();
  return res.json({ success: true, data });
});
export const getPublicProductBySlug = asyncWrapper(async (req, res) => {
  const data = await souvenirService.getPublicProductBySlug(req.validated.params.slug);
  return res.json({ success: true, data });
});
export const getAdminProducts = asyncWrapper(async (_req, res) => {
  const data = await souvenirService.getAdminProducts();
  return res.json({ success: true, data });
});
export const createProduct = asyncWrapper(async (req, res) => {
  const data = await souvenirService.createProduct(req.validated.body);
  return res.status(201).json({ success: true, data });
});
export const updateProduct = asyncWrapper(async (req, res) => {
  const data = await souvenirService.updateProduct(req.validated.params.id, req.validated.body);
  return res.json({ success: true, data });
});
export const setProductActive = asyncWrapper(async (req, res) => {
  const data = await souvenirService.setProductActive(req.validated.params.id, req.validated.body.active);
  return res.json({ success: true, data });
});
export const createColorOption = asyncWrapper(async (req, res) => {
  const data = await souvenirService.createColorOption(req.validated.params.id, req.validated.body);
  return res.status(201).json({ success: true, data });
});
export const updateColorOption = asyncWrapper(async (req, res) => {
  const data = await souvenirService.updateColorOption(req.validated.params.colorId, req.validated.body);
  return res.json({ success: true, data });
});
export const setColorOptionActive = asyncWrapper(async (req, res) => {
  const data = await souvenirService.setColorOptionActive(req.validated.params.colorId, req.validated.body.active);
  return res.json({ success: true, data });
});
export const createPriceTier = asyncWrapper(async (req, res) => {
  const data = await souvenirService.createPriceTier(req.validated.params.id, req.validated.body);
  return res.status(201).json({ success: true, data });
});
export const updatePriceTier = asyncWrapper(async (req, res) => {
  const data = await souvenirService.updatePriceTier(req.validated.params.tierId, req.validated.body);
  return res.json({ success: true, data });
});
export const setPriceTierActive = asyncWrapper(async (req, res) => {
  const data = await souvenirService.setPriceTierActive(req.validated.params.tierId, req.validated.body.active);
  return res.json({ success: true, data });
});
export const createProductMedia = asyncWrapper(async (req, res) => {
  const data = await souvenirService.createProductMedia(req.validated.params.id, req.validated.body);
  return res.status(201).json({ success: true, data });
});
export const updateProductMedia = asyncWrapper(async (req, res) => {
  const data = await souvenirService.updateProductMedia(req.validated.params.mediaId, req.validated.body);
  return res.json({ success: true, data });
});


export const createGuestSouvenirOrder = asyncWrapper(async (req, res) => {
  const result = await souvenirService.createGuestSouvenirOrder(req.validated.body);
  return res.status(201).json({
    success: true,
    message: "Souvenir order request submitted",
    data: result,
  });
});

export const getGuestSouvenirOrder = asyncWrapper(async (req, res) => {
  const data = await souvenirService.getGuestSouvenirOrder(req.validated.params.token);
  return res.json({ success: true, data });
});

export const listAdminSouvenirOrders = asyncWrapper(async (req, res) => {
  const data = await souvenirService.listAdminSouvenirOrders(req.validated.query);
  return res.json({ success: true, data });
});

export const getAdminSouvenirOrder = asyncWrapper(async (req, res) => {
  const data = await souvenirService.getAdminSouvenirOrder(req.validated.params.id);
  return res.json({ success: true, data });
});

export const updateAdminSouvenirOrder = asyncWrapper(async (req, res) => {
  const data = await souvenirService.updateAdminSouvenirOrder(req.validated.params.id, req.validated.body);
  return res.json({ success: true, data });
});

export const createGuestSouvenirEnquiry = asyncWrapper(async (req, res) => {
  const result = await souvenirService.createGuestSouvenirEnquiry({
    data: req.validated.body,
    files: req.files ?? [],
  });
  return res.status(201).json({
    success: true,
    message: "Custom souvenir enquiry submitted",
    data: result,
  });
});

export const getGuestSouvenirEnquiry = asyncWrapper(async (req, res) => {
  const data = await souvenirService.getGuestSouvenirEnquiry(req.validated.params.token);
  return res.json({ success: true, data });
});

export const listAdminSouvenirEnquiries = asyncWrapper(async (req, res) => {
  const data = await souvenirService.listAdminSouvenirEnquiries(req.validated.query);
  return res.json({ success: true, data });
});

export const getAdminSouvenirEnquiry = asyncWrapper(async (req, res) => {
  const data = await souvenirService.getAdminSouvenirEnquiry(req.validated.params.id);
  return res.json({ success: true, data });
});

export const updateAdminSouvenirEnquiry = asyncWrapper(async (req, res) => {
  const data = await souvenirService.updateAdminSouvenirEnquiry(req.validated.params.id, req.validated.body);
  return res.json({ success: true, data });
});
