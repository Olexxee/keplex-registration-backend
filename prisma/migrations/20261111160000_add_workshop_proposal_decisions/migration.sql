ALTER TYPE "WorkshopBookingStatus" ADD VALUE IF NOT EXISTS 'DECLINED';

ALTER TABLE "WorkshopBooking"
  ADD COLUMN "proposalPrice" DECIMAL(12,2),
  ADD COLUMN "proposalDetails" TEXT,
  ADD COLUMN "proposalExpiresAt" TIMESTAMP(3),
  ADD COLUMN "proposalSentAt" TIMESTAMP(3),
  ADD COLUMN "proposalRespondedAt" TIMESTAMP(3);
