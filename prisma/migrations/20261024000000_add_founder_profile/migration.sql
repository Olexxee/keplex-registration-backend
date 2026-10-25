CREATE TABLE "FounderProfile" (
  "id" TEXT NOT NULL DEFAULT 'founder-profile',
  "name" TEXT NOT NULL DEFAULT 'Kepemi Oluwafunke (Keplex)',
  "role" TEXT NOT NULL DEFAULT 'Founder',
  "mediaUrl" TEXT,
  "mediaPublicId" TEXT,
  "mediaAltText" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FounderProfile_pkey" PRIMARY KEY ("id")
);
