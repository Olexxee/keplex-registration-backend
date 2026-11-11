import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as service from "./faq.service.js";

const ok = (res, message, data) =>
  res.status(200).json({ success: true, message, data });

export const getPublicFaqs = asyncWrapper(async (_req, res) =>
  ok(res, "Published FAQs retrieved", await service.getPublicFaqs()),
);

export const getAdminFaqs = asyncWrapper(async (_req, res) =>
  ok(res, "FAQs retrieved", await service.getAdminFaqs()),
);

export const createFaq = asyncWrapper(async (req, res) =>
  res.status(201).json({
    success: true,
    message: "FAQ created as draft",
    data: await service.createFaq(req.validated.body),
  }),
);

export const updateFaq = asyncWrapper(async (req, res) =>
  ok(
    res,
    "FAQ updated",
    await service.updateFaq(req.validated.params.id, req.validated.body),
  ),
);

export const deleteFaq = asyncWrapper(async (req, res) =>
  ok(res, "FAQ deleted", await service.deleteFaq(req.validated.params.id)),
);
