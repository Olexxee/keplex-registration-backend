import express from "express";
import multer from "multer";
import * as controller from "./certificate.controller.js";
import {
  certificateIdSchema,
  certificateNumberParamsSchema,
  createSubmissionSchema,
  issueDirectCertificateSchema,
  listCertificatesQuerySchema,
  listSubmissionsQuerySchema,
  reviewSubmissionSchema,
  revokeCertificateSchema,
} from "./certificate.validation.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middlewares/validateMiddleware.js";

const router = express.Router();
const admin = [authMiddleware, roleMiddleware("ADMIN", "SUPER_ADMIN")];

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return callback(new Error("Proof must be a PDF, JPEG, PNG, or WebP file."));
    }
    return callback(null, true);
  },
});

// Public endpoints
router.post(
  "/submissions",
  proofUpload.single("proof"),
  validateBody(createSubmissionSchema),
  controller.createSubmission,
);
router.get(
  "/verify/:certificateNumber",
  validateParams(certificateNumberParamsSchema),
  controller.verifyCertificate,
);

// Admin submission review
router.get(
  "/admin/submissions",
  ...admin,
  validateQuery(listSubmissionsQuerySchema),
  controller.listSubmissions,
);
router.get(
  "/admin/submissions/:id",
  ...admin,
  validateParams(certificateIdSchema),
  controller.getSubmission,
);
router.patch(
  "/admin/submissions/:id/review",
  ...admin,
  validateParams(certificateIdSchema),
  validateBody(reviewSubmissionSchema),
  controller.reviewSubmission,
);
router.post(
  "/admin/submissions/:id/issue",
  ...admin,
  validateParams(certificateIdSchema),
  controller.issueFromSubmission,
);

// Admin direct issuance deliberately does not require a Registration match.
router.post(
  "/admin/issue",
  ...admin,
  validateBody(issueDirectCertificateSchema),
  controller.issueDirectly,
);
router.get(
  "/admin",
  ...admin,
  validateQuery(listCertificatesQuerySchema),
  controller.listCertificates,
);
router.get(
  "/admin/:id",
  ...admin,
  validateParams(certificateIdSchema),
  controller.getCertificate,
);
router.post(
  "/admin/:id/resend",
  ...admin,
  validateParams(certificateIdSchema),
  controller.resendCertificate,
);
router.patch(
  "/admin/:id/revoke",
  ...admin,
  validateParams(certificateIdSchema),
  validateBody(revokeCertificateSchema),
  controller.revokeCertificate,
);

export default router;
