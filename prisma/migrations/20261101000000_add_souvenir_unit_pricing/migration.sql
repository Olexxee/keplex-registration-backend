-- Introduce volume-based per-piece pricing without guessing how legacy fixed-tier prices
-- should be converted. Existing tiers are deactivated until an administrator reviews and
-- enters an explicit per-unit rate. Historical order totals remain immutable.
ALTER TABLE "SouvenirPriceTier"
  ADD COLUMN "unitPrice" DECIMAL(12, 2);

ALTER TABLE "SouvenirOrder"
  ADD COLUMN "unitPriceSnapshot" DECIMAL(12, 2);

UPDATE "SouvenirPriceTier"
SET "active" = false
WHERE "active" = true;
