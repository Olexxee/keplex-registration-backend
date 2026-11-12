ALTER TYPE "EmailOutboxType" ADD VALUE IF NOT EXISTS 'WORKSHOP_BOOKING_ACCESS_CODE';

CREATE TABLE "WorkshopGuestAccessChallenge" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "challengeTokenHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkshopGuestAccessChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopGuestAccessSession" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkshopGuestAccessSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkshopGuestAccessChallenge_challengeTokenHash_key"
  ON "WorkshopGuestAccessChallenge"("challengeTokenHash");
CREATE INDEX "WorkshopGuestAccessChallenge_bookingId_createdAt_idx"
  ON "WorkshopGuestAccessChallenge"("bookingId", "createdAt");
CREATE INDEX "WorkshopGuestAccessChallenge_expiresAt_consumedAt_idx"
  ON "WorkshopGuestAccessChallenge"("expiresAt", "consumedAt");

CREATE UNIQUE INDEX "WorkshopGuestAccessSession_tokenHash_key"
  ON "WorkshopGuestAccessSession"("tokenHash");
CREATE INDEX "WorkshopGuestAccessSession_bookingId_expiresAt_idx"
  ON "WorkshopGuestAccessSession"("bookingId", "expiresAt");
CREATE INDEX "WorkshopGuestAccessSession_expiresAt_revokedAt_idx"
  ON "WorkshopGuestAccessSession"("expiresAt", "revokedAt");

ALTER TABLE "WorkshopGuestAccessChallenge"
  ADD CONSTRAINT "WorkshopGuestAccessChallenge_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "WorkshopBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopGuestAccessSession"
  ADD CONSTRAINT "WorkshopGuestAccessSession_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "WorkshopBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
