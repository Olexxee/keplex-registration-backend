ALTER TYPE "EmailOutboxType" ADD VALUE 'CERTIFICATE_DELIVERY';

ALTER TABLE "EmailOutbox"
  ADD COLUMN "certificateId" TEXT;

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "EmailOutbox_certificateId_fkey"
  FOREIGN KEY ("certificateId")
  REFERENCES "Certificate"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "EmailOutbox_certificateId_idx"
  ON "EmailOutbox"("certificateId");
