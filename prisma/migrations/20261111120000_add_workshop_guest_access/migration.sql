-- Existing workshop bookings remain readable; only newly created bookings receive access credentials.
ALTER TABLE "WorkshopBooking"
ADD COLUMN IF NOT EXISTS "accessTokenHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WorkshopBooking_accessTokenHash_key"
ON "WorkshopBooking"("accessTokenHash");
