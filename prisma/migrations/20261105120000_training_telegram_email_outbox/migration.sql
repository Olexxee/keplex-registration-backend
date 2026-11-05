ALTER TABLE "TrainingProgram" ADD COLUMN "telegramGroupUrl" TEXT;

CREATE TYPE "EmailOutboxType" AS ENUM ('TRAINING_TELEGRAM_ACCESS');
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DEAD');

CREATE TABLE "EmailOutbox" (
  "id" TEXT NOT NULL,
  "type" "EmailOutboxType" NOT NULL,
  "registrationId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailOutbox_registrationId_type_key" ON "EmailOutbox"("registrationId", "type");
CREATE INDEX "EmailOutbox_status_availableAt_idx" ON "EmailOutbox"("status", "availableAt");
CREATE INDEX "EmailOutbox_status_lockedAt_idx" ON "EmailOutbox"("status", "lockedAt");

ALTER TABLE "Payment" ADD COLUMN "onboardingSnapshot" JSONB;
