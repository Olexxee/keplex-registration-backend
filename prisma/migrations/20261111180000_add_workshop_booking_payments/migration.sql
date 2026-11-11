ALTER TABLE "Payment"
  ADD COLUMN "workshopBookingId" TEXT;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_workshopBookingId_fkey"
  FOREIGN KEY ("workshopBookingId") REFERENCES "WorkshopBooking"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Payment_workshopBookingId_idx"
  ON "Payment"("workshopBookingId");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_exactly_one_target_check"
  CHECK (num_nonnulls("registrationId", "souvenirOrderId", "workshopBookingId") = 1);

CREATE UNIQUE INDEX "Payment_one_pending_workshop_attempt_idx"
  ON "Payment"("workshopBookingId")
  WHERE "workshopBookingId" IS NOT NULL AND "status" = 'PENDING';
