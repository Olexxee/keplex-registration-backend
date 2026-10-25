import { randomUUID } from "node:crypto";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../classes/errorClasses.js";
import { cloudinary } from "../../config/cloudinary.js";
import * as db from "./certificate.db.js";
import {
  createCertificatePdf,
  getProofAccessUrl,
  uploadCertificateDocument,
  uploadProofFile,
} from "./certificate.document.js";
import { sendCertificateEmail } from "./certificate.email.js";

const normalizeEmail = (value) => value.trim().toLowerCase();
const certificateNumber = () =>
  `KPX-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

const safeSubmission = (submission) => {
  if (!submission) return submission;
  const { proofPublicId, proofUrl, ...rest } = submission;
  return {
    ...rest,
    proofAccessUrl: getProofAccessUrl(submission),
    registrationMatch: Boolean(submission.registrationId),
  };
};

const validateProofFile = (file) => {
  if (!file) throw new BadRequestError("A proof-of-work file is required.");
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    throw new BadRequestError("Proof must be a PDF, JPEG, PNG, or WebP file.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new BadRequestError("Proof file must not exceed 10 MB.");
  }
  const bytes = file.buffer;
  const isPdf = file.mimetype === "application/pdf" && bytes.subarray(0, 5).toString() === "%PDF-";
  const isJpeg = file.mimetype === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = file.mimetype === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = file.mimetype === "image/webp" && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!(isPdf || isJpeg || isPng || isWebp)) {
    throw new BadRequestError("The uploaded file content does not match its file type.");
  }
};

export const createSubmission = async (data, file) => {
  validateProofFile(file);
  const studentEmail = normalizeEmail(data.studentEmail);
  const studentName = data.studentName.trim();
  const program = await db.findTrainingProgram(data.trainingProgramId);
  if (!program) throw new NotFoundError("Training programme not found.");

  const existing = await db.findExistingSubmission(
    program.id,
    studentEmail,
    ["PENDING", "APPROVED"],
  );
  if (existing) {
    throw new ConflictError("A pending or approved proof submission already exists for this email and training programme.");
  }

  const registration = await db.findRegistration(program.id, studentEmail);
  const uploaded = await uploadProofFile(file);

  try {
    const submission = await db.createSubmission({
      studentName,
      studentEmail,
      trainingProgramId: program.id,
      registrationId: registration?.id ?? null,
      proofUrl: uploaded.url,
      proofPublicId: uploaded.publicId,
      proofOriginalName: file.originalname.slice(0, 255),
      proofMimeType: file.mimetype,
      proofBytes: file.size,
      notes: data.notes?.trim() || null,
    });
    return {
      id: submission.id,
      studentName: submission.studentName,
      studentEmail: submission.studentEmail,
      trainingProgram: submission.trainingProgram,
      status: submission.status,
      registrationMatch: Boolean(registration),
      createdAt: submission.createdAt,
    };
  } catch (error) {
    await cloudinary.uploader.destroy(uploaded.publicId, {
      resource_type: uploaded.resourceType ?? (file.mimetype === "application/pdf" ? "raw" : "image"),
      type: "authenticated",
    }).catch(() => {});
    throw error;
  }
};

export const listSubmissions = async (query) => {
  const [items, total] = await Promise.all([
    db.listSubmissions(query),
    db.countSubmissions(query),
  ]);
  return {
    items: items.map(safeSubmission),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getSubmission = async (id) => {
  const submission = await db.findSubmissionById(id);
  if (!submission) throw new NotFoundError("Certificate submission not found.");
  return safeSubmission(submission);
};

export const reviewSubmission = async (id, { status, reviewNotes }, adminId) => {
  const submission = await db.findSubmissionById(id);
  if (!submission) throw new NotFoundError("Certificate submission not found.");
  if (submission.status !== "PENDING") {
    throw new ConflictError("Only pending submissions can be reviewed.");
  }
  return db.updateSubmission(id, {
    status,
    reviewNotes: reviewNotes?.trim() || null,
    reviewedAt: new Date(),
    reviewedByAdminId: adminId,
  });
};

const createAndEmailCertificate = async ({
  studentName,
  studentEmail,
  trainingProgramTitle,
  trainingProgramId = null,
  registrationId = null,
  submissionId = null,
  issuedByAdminId,
}) => {
  const email = normalizeEmail(studentEmail);
  const title = trainingProgramTitle.trim();
  const name = studentName.trim();
  const duplicate = await db.findActiveCertificateForRecipient(email, title);
  if (duplicate) {
    throw new ConflictError(`An active certificate already exists for this email and programme (${duplicate.certificateNumber}).`);
  }

  const number = certificateNumber();
  const issuedAt = new Date();
  const pdfBuffer = createCertificatePdf({
    studentName: name,
    trainingProgramTitle: title,
    certificateNumber: number,
    issuedAt,
  });
  const uploadedDocument = await uploadCertificateDocument(pdfBuffer, number);

  let certificate;
  try {
    certificate = await db.createCertificate({
      certificateNumber: number,
      studentName: name,
      studentEmail: email,
      trainingProgramTitle: title,
      trainingProgramId,
      registrationId,
      submissionId,
      issuedAt,
      issuedByAdminId,
      status: "ISSUED",
      documentUrl: uploadedDocument.url,
      documentPublicId: uploadedDocument.publicId,
    });
  } catch (error) {
    await cloudinary.uploader.destroy(uploadedDocument.publicId, {
      resource_type: "raw",
      type: "authenticated",
    }).catch(() => {});
    throw error;
  }

  let emailSent = false;
  let emailError = null;
  let emailStatusPersisted = false;
  let emailSentAt = null;

  try {
    await sendCertificateEmail({ certificate, pdfBuffer });
    emailSent = true;
    emailSentAt = new Date();

    try {
      await db.updateCertificate(certificate.id, {
        emailSentAt,
        lastEmailError: null,
      });
      emailStatusPersisted = true;
    } catch (persistenceError) {
      emailError = "Email was accepted by the provider, but its status could not be saved.";
      console.error("[certificates] Email accepted but certificate status update failed:", persistenceError);
    }
  } catch (error) {
    emailError = error.message;
    try {
      await db.updateCertificate(certificate.id, {
        lastEmailError: error.message.slice(0, 1000),
      });
    } catch (persistenceError) {
      console.error("[certificates] Could not save certificate email failure:", persistenceError);
    }
  }

  return {
    certificate: {
      ...certificate,
      emailSentAt: emailStatusPersisted ? emailSentAt : null,
      lastEmailError: emailError,
    },
    emailSent,
    emailError,
    emailStatusPersisted,
  };
};

export const issueFromSubmission = async (submissionId, adminId) => {
  const submission = await db.findSubmissionById(submissionId);
  if (!submission) throw new NotFoundError("Certificate submission not found.");
  if (submission.status !== "APPROVED") {
    throw new BadRequestError("The proof submission must be approved before a certificate can be issued.");
  }
  if (submission.certificate) {
    throw new ConflictError(`A certificate has already been issued for this submission: ${submission.certificate.certificateNumber}.`);
  }
  return createAndEmailCertificate({
    studentName: submission.studentName,
    studentEmail: submission.studentEmail,
    trainingProgramTitle: submission.trainingProgram.title,
    trainingProgramId: submission.trainingProgramId,
    registrationId: submission.registrationId,
    submissionId: submission.id,
    issuedByAdminId: adminId,
  });
};

export const issueDirectly = async (data, adminId) => {
  let trainingProgramId = null;
  let trainingProgramTitle = data.trainingProgramTitle.trim();
  if (data.trainingProgramId) {
    const program = await db.findTrainingProgram(data.trainingProgramId);
    if (!program) throw new NotFoundError("Training programme not found.");
    trainingProgramId = program.id;
    trainingProgramTitle = program.title;
  }

  // Deliberately do not query Registration here. Direct admin issuance is allowed
  // for historical students and recipients who never registered on the website.
  return createAndEmailCertificate({
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    trainingProgramTitle,
    trainingProgramId,
    registrationId: null,
    submissionId: null,
    issuedByAdminId: adminId,
  });
};

const createPdfForCertificate = (certificate) =>
  createCertificatePdf({
    studentName: certificate.studentName,
    trainingProgramTitle: certificate.trainingProgramTitle,
    certificateNumber: certificate.certificateNumber,
    issuedAt: certificate.issuedAt,
  });

const withDocumentAccessUrl = (certificate) => ({
  ...certificate,
  documentAccessUrl: cloudinary.url(certificate.documentPublicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
    format: "pdf",
  }),
});

export const getCertificate = async (id) => {
  const certificate = await db.findCertificateById(id);
  if (!certificate) throw new NotFoundError("Certificate not found.");
  return withDocumentAccessUrl(certificate);
};

export const listCertificates = async (query) => {
  const [items, total] = await Promise.all([
    db.listCertificates(query),
    db.countCertificates(query),
  ]);
  return {
    items: items.map(withDocumentAccessUrl),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const resendCertificate = async (id) => {
  const certificate = await db.findCertificateById(id);
  if (!certificate) throw new NotFoundError("Certificate not found.");
  if (certificate.status !== "ISSUED") {
    throw new BadRequestError("A revoked certificate cannot be emailed.");
  }

  const pdfBuffer = createPdfForCertificate(certificate);
  try {
    await sendCertificateEmail({ certificate, pdfBuffer });
  } catch (error) {
    try {
      await db.updateCertificate(id, {
        lastEmailError: error.message.slice(0, 1000),
      });
    } catch (persistenceError) {
      console.error("[certificates] Could not save resend failure:", persistenceError);
    }
    throw new BadRequestError(`Certificate exists, but the email provider rejected the request: ${error.message}`);
  }

  const emailSentAt = new Date();
  try {
    const updated = await db.updateCertificate(id, {
      emailSentAt,
      lastEmailError: null,
    });
    return { certificate: updated, emailSent: true, emailStatusPersisted: true, warning: null };
  } catch (persistenceError) {
    console.error("[certificates] Email accepted but resend status update failed:", persistenceError);
    return {
      certificate,
      emailSent: true,
      emailStatusPersisted: false,
      warning: "The email provider accepted the certificate email, but the delivery status could not be saved.",
    };
  }
};

export const revokeCertificate = async (id, reason) => {
  const certificate = await db.findCertificateById(id);
  if (!certificate) throw new NotFoundError("Certificate not found.");
  if (certificate.status === "REVOKED") {
    throw new ConflictError("This certificate has already been revoked.");
  }
  return db.updateCertificate(id, {
    status: "REVOKED",
    revokedAt: new Date(),
    revocationReason: reason.trim(),
  });
};

export const verifyCertificate = async (number) => {
  const certificate = await db.findCertificateByNumber(number);
  if (!certificate) throw new NotFoundError("Certificate not found.");
  return {
    certificateNumber: certificate.certificateNumber,
    studentName: certificate.studentName,
    trainingProgramTitle: certificate.trainingProgramTitle,
    issuedAt: certificate.issuedAt,
    status: certificate.status,
    valid: certificate.status === "ISSUED",
    revokedAt: certificate.revokedAt,
    revocationReason: certificate.status === "REVOKED" ? certificate.revocationReason : null,
  };
};
