CREATE TYPE "CertificateSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

CREATE TABLE "CertificateSubmission" (
  "id" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "studentEmail" TEXT NOT NULL,
  "trainingProgramId" TEXT NOT NULL,
  "registrationId" TEXT,
  "proofUrl" TEXT NOT NULL,
  "proofPublicId" TEXT NOT NULL,
  "proofOriginalName" TEXT NOT NULL,
  "proofMimeType" TEXT NOT NULL,
  "proofBytes" INTEGER NOT NULL,
  "notes" TEXT,
  "status" "CertificateSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CertificateSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Certificate" (
  "id" TEXT NOT NULL,
  "certificateNumber" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "studentEmail" TEXT NOT NULL,
  "trainingProgramTitle" TEXT NOT NULL,
  "trainingProgramId" TEXT,
  "registrationId" TEXT,
  "submissionId" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuedByAdminId" TEXT NOT NULL,
  "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "documentUrl" TEXT NOT NULL,
  "documentPublicId" TEXT NOT NULL,
  "emailSentAt" TIMESTAMP(3),
  "lastEmailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");
CREATE UNIQUE INDEX "Certificate_submissionId_key" ON "Certificate"("submissionId");
CREATE INDEX "Certificate_studentEmail_status_idx" ON "Certificate"("studentEmail", "status");
CREATE INDEX "Certificate_trainingProgramId_status_idx" ON "Certificate"("trainingProgramId", "status");
CREATE INDEX "Certificate_issuedAt_idx" ON "Certificate"("issuedAt");

CREATE INDEX "CertificateSubmission_status_createdAt_idx" ON "CertificateSubmission"("status", "createdAt");
CREATE INDEX "CertificateSubmission_studentEmail_idx" ON "CertificateSubmission"("studentEmail");
CREATE INDEX "CertificateSubmission_trainingProgramId_studentEmail_idx" ON "CertificateSubmission"("trainingProgramId", "studentEmail");
CREATE INDEX "CertificateSubmission_registrationId_idx" ON "CertificateSubmission"("registrationId");

ALTER TABLE "CertificateSubmission"
  ADD CONSTRAINT "CertificateSubmission_trainingProgramId_fkey"
  FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateSubmission"
  ADD CONSTRAINT "CertificateSubmission_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_trainingProgramId_fkey"
  FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "CertificateSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
