-- Allow the shared Payment model to belong to either a training registration or a souvenir order.
ALTER TABLE "Payment" ALTER COLUMN "registrationId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN "souvenirOrderId" TEXT;
CREATE INDEX "Payment_souvenirOrderId_idx" ON "Payment"("souvenirOrderId");
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_souvenirOrderId_fkey"
  FOREIGN KEY ("souvenirOrderId") REFERENCES "SouvenirOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
