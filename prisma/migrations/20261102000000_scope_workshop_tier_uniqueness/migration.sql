-- Archive state keeps products and order snapshots without exposing them publicly.
ALTER TABLE "SouvenirProduct" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Workshop participant counts are scoped to an offering.
-- Remove the legacy global uniqueness constraint if an earlier db push created it.
DROP INDEX IF EXISTS "WorkshopParticipantTier_participantCount_key";

-- Keep participant counts unique only within the same workshop offering.
CREATE UNIQUE INDEX IF NOT EXISTS "WorkshopParticipantTier_offeringId_participantCount_key"
ON "WorkshopParticipantTier" ("offeringId", "participantCount");
