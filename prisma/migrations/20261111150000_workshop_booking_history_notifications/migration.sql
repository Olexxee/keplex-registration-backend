-- Workshop booking audit history and transactional customer notification outbox.
DROP INDEX IF EXISTS "EmailOutbox_registrationId_type_key";

ALTER TABLE "EmailOutbox"
  ALTER COLUMN "registrationId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "workshopBookingId" TEXT,
  ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;

UPDATE "EmailOutbox"
SET "dedupeKey" = COALESCE("registrationId", 'legacy') || ':' || "type"::TEXT
WHERE "dedupeKey" IS NULL;

ALTER TABLE "EmailOutbox"
  ALTER COLUMN "dedupeKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "EmailOutbox_dedupeKey_key"
  ON "EmailOutbox"("dedupeKey");

CREATE INDEX IF NOT EXISTS "EmailOutbox_workshopBookingId_idx"
  ON "EmailOutbox"("workshopBookingId");

ALTER TABLE "EmailOutbox"
  ADD CONSTRAINT "EmailOutbox_workshopBookingId_fkey"
  FOREIGN KEY ("workshopBookingId") REFERENCES "WorkshopBooking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "WorkshopBookingHistoryAction" AS ENUM ('CREATED', 'STATUS_CHANGED', 'RESCHEDULED', 'UPDATED');

CREATE TABLE "WorkshopBookingHistory" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "action" "WorkshopBookingHistoryAction" NOT NULL,
  "previousStatus" "WorkshopBookingStatus",
  "newStatus" "WorkshopBookingStatus",
  "previousEventDate" TIMESTAMP(3),
  "newEventDate" TIMESTAMP(3),
  "customerMessage" TEXT,
  "actorAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkshopBookingHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkshopBookingHistory_bookingId_createdAt_idx"
  ON "WorkshopBookingHistory"("bookingId", "createdAt");
CREATE INDEX "WorkshopBookingHistory_actorAdminId_createdAt_idx"
  ON "WorkshopBookingHistory"("actorAdminId", "createdAt");

ALTER TABLE "WorkshopBookingHistory"
  ADD CONSTRAINT "WorkshopBookingHistory_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "WorkshopBooking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WorkshopBookingHistory_actorAdminId_fkey"
  FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
