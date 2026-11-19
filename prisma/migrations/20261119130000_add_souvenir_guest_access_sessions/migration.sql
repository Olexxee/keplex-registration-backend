CREATE TABLE "SouvenirGuestAccessChallenge" (
  "id" TEXT NOT NULL,
  "enquiryId" TEXT NOT NULL,
  "challengeTokenHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SouvenirGuestAccessChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SouvenirGuestAccessChallenge_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "SouvenirEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SouvenirGuestAccessChallenge_challengeTokenHash_key" ON "SouvenirGuestAccessChallenge"("challengeTokenHash");
CREATE INDEX "SouvenirGuestAccessChallenge_enquiryId_createdAt_idx" ON "SouvenirGuestAccessChallenge"("enquiryId", "createdAt");
CREATE INDEX "SouvenirGuestAccessChallenge_expiresAt_consumedAt_idx" ON "SouvenirGuestAccessChallenge"("expiresAt", "consumedAt");

CREATE TABLE "SouvenirGuestAccessSession" (
  "id" TEXT NOT NULL,
  "enquiryId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SouvenirGuestAccessSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SouvenirGuestAccessSession_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "SouvenirEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SouvenirGuestAccessSession_tokenHash_key" ON "SouvenirGuestAccessSession"("tokenHash");
CREATE INDEX "SouvenirGuestAccessSession_enquiryId_expiresAt_idx" ON "SouvenirGuestAccessSession"("enquiryId", "expiresAt");
CREATE INDEX "SouvenirGuestAccessSession_expiresAt_revokedAt_idx" ON "SouvenirGuestAccessSession"("expiresAt", "revokedAt");
