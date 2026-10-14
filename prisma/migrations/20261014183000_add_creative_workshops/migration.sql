CREATE TYPE "WorkshopType" AS ENUM ('RESIN_ART', 'LIP_CARE_FORMULATION', 'CUSTOM_GROUP');
CREATE TYPE "WorkshopVenueMode" AS ENUM ('CLIENT_VENUE', 'KPX_VENUE', 'UNDECIDED');
CREATE TYPE "WorkshopBookingStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'PROPOSAL_SENT', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "WorkshopOffering" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "workshopType" "WorkshopType" NOT NULL,
  "description" TEXT NOT NULL,
  "bookingTerms" TEXT,
  "contactEmail" TEXT,
  "contactWhatsApp" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopOffering_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopParticipantTier" (
  "id" TEXT NOT NULL,
  "offeringId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "participantCount" INTEGER NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopParticipantTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkshopBooking" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "customerWhatsApp" TEXT NOT NULL,
  "offeringId" TEXT NOT NULL,
  "participantTierId" TEXT,
  "workshopTitleSnapshot" TEXT NOT NULL,
  "workshopType" "WorkshopType" NOT NULL,
  "participantCount" INTEGER NOT NULL,
  "priceSnapshot" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "eventDate" TIMESTAMP(3) NOT NULL,
  "venueMode" "WorkshopVenueMode" NOT NULL,
  "venueAddress" TEXT,
  "city" TEXT,
  "customWorkshopDescription" TEXT,
  "customerNotes" TEXT,
  "status" "WorkshopBookingStatus" NOT NULL DEFAULT 'NEW',
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkshopBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkshopOffering_slug_key" ON "WorkshopOffering"("slug");
CREATE INDEX "WorkshopOffering_active_displayOrder_idx" ON "WorkshopOffering"("active", "displayOrder");
CREATE INDEX "WorkshopOffering_featured_displayOrder_idx" ON "WorkshopOffering"("featured", "displayOrder");

CREATE UNIQUE INDEX "WorkshopParticipantTier_offeringId_participantCount_key" ON "WorkshopParticipantTier"("offeringId", "participantCount");
CREATE INDEX "WorkshopParticipantTier_offeringId_active_participantCount_idx" ON "WorkshopParticipantTier"("offeringId", "active", "participantCount");

CREATE UNIQUE INDEX "WorkshopBooking_publicReference_key" ON "WorkshopBooking"("publicReference");
CREATE INDEX "WorkshopBooking_status_createdAt_idx" ON "WorkshopBooking"("status", "createdAt");
CREATE INDEX "WorkshopBooking_eventDate_idx" ON "WorkshopBooking"("eventDate");
CREATE INDEX "WorkshopBooking_customerEmail_idx" ON "WorkshopBooking"("customerEmail");
CREATE INDEX "WorkshopBooking_customerWhatsApp_idx" ON "WorkshopBooking"("customerWhatsApp");

ALTER TABLE "WorkshopParticipantTier"
ADD CONSTRAINT "WorkshopParticipantTier_offeringId_fkey"
FOREIGN KEY ("offeringId") REFERENCES "WorkshopOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkshopBooking"
ADD CONSTRAINT "WorkshopBooking_offeringId_fkey"
FOREIGN KEY ("offeringId") REFERENCES "WorkshopOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkshopBooking"
ADD CONSTRAINT "WorkshopBooking_participantTierId_fkey"
FOREIGN KEY ("participantTierId") REFERENCES "WorkshopParticipantTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
