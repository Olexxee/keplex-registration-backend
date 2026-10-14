import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as service from "./certificate.service.js";

export const createSubmission = asyncWrapper(async (req, res) => {
  const data = await service.createSubmission(req.validated.body, req.file);
  return res.status(201).json({
    success: true,
    message: "Proof of work submitted for admin review.",
    data,
  });
});

export const listSubmissions = asyncWrapper(async (req, res) => {
  const data = await service.listSubmissions(req.validated.query);
  return res.json({ success: true, data });
});

export const getSubmission = asyncWrapper(async (req, res) => {
  const data = await service.getSubmission(req.validated.params.id);
  return res.json({ success: true, data });
});

export const reviewSubmission = asyncWrapper(async (req, res) => {
  await service.reviewSubmission(req.validated.params.id, req.validated.body, req.user.id);
  const data = await service.getSubmission(req.validated.params.id);
  return res.json({ success: true, message: "Submission review saved.", data });
});

export const issueFromSubmission = asyncWrapper(async (req, res) => {
  const result = await service.issueFromSubmission(req.validated.params.id, req.user.id);
  return res.status(201).json({
    success: true,
    message: result.emailSent
      ? "Certificate issued and emailed successfully."
      : "Certificate issued, but email delivery failed. Use resend after configuring email delivery.",
    data: result,
  });
});

export const issueDirectly = asyncWrapper(async (req, res) => {
  const result = await service.issueDirectly(req.validated.body, req.user.id);
  return res.status(201).json({
    success: true,
    message: result.emailSent
      ? "Certificate issued and emailed successfully."
      : "Certificate issued, but email delivery failed. Use resend after configuring email delivery.",
    data: result,
  });
});

export const listCertificates = asyncWrapper(async (req, res) => {
  const data = await service.listCertificates(req.validated.query);
  return res.json({ success: true, data });
});

export const getCertificate = asyncWrapper(async (req, res) => {
  const data = await service.getCertificate(req.validated.params.id);
  return res.json({ success: true, data });
});

export const resendCertificate = asyncWrapper(async (req, res) => {
  const data = await service.resendCertificate(req.validated.params.id);
  return res.json({ success: true, message: "Certificate email sent.", data });
});

export const revokeCertificate = asyncWrapper(async (req, res) => {
  const data = await service.revokeCertificate(
    req.validated.params.id,
    req.validated.body.reason,
  );
  return res.json({ success: true, message: "Certificate revoked.", data });
});

export const verifyCertificate = asyncWrapper(async (req, res) => {
  const data = await service.verifyCertificate(req.validated.params.certificateNumber);
  return res.json({ success: true, data });
});
