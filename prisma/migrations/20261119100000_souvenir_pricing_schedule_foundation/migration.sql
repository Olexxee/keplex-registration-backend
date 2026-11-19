-- Souvenir pricing schedule foundation (expand-only).
-- Existing tiers are intentionally left as historical/non-current. No products,
-- tiers, orders, payments, media, colours, enquiries, or quotes are deleted.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "SouvenirProduct"
  ADD COLUMN "pricingVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SouvenirPriceTier"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SouvenirOrder"
  ADD COLUMN "priceTierVersionSnapshot" INTEGER,
  ADD COLUMN "priceTierMinQuantitySnapshot" INTEGER,
  ADD COLUMN "priceTierMaxQuantitySnapshot" INTEGER;

-- NOT VALID avoids rejecting legacy rows during the expand migration, while
-- PostgreSQL still enforces these checks for every new or updated row.
ALTER TABLE "SouvenirPriceTier"
  ADD CONSTRAINT "SouvenirPriceTier_quantity_bounds_check"
    CHECK ("minQuantity" >= 1 AND ("maxQuantity" IS NULL OR "maxQuantity" >= "minQuantity")) NOT VALID,
  ADD CONSTRAINT "SouvenirPriceTier_current_price_check"
    CHECK (NOT "isCurrent" OR ("unitPrice" IS NOT NULL AND "unitPrice" > 0 AND "currency" = 'NGN')) NOT VALID,
  ADD CONSTRAINT "SouvenirPriceTier_version_check"
    CHECK ("version" >= 0) NOT VALID;

ALTER TABLE "SouvenirProduct"
  ADD CONSTRAINT "SouvenirProduct_pricing_version_check"
    CHECK ("pricingVersion" >= 0) NOT VALID;

-- Inclusive bands become half-open bigint ranges. A finite maximum is raised
-- by one; NULL remains an unbounded upper endpoint. Legacy rows are excluded.
ALTER TABLE "SouvenirPriceTier"
  ADD CONSTRAINT "SouvenirPriceTier_current_ranges_excl"
  EXCLUDE USING gist (
    "productId" WITH =,
    int8range("minQuantity"::bigint, "maxQuantity"::bigint + 1, '[)') WITH &&
  ) WHERE ("isCurrent" = true);

CREATE INDEX "SouvenirPriceTier_productId_isCurrent_minQuantity_idx"
  ON "SouvenirPriceTier"("productId", "isCurrent", "minQuantity");

CREATE INDEX "SouvenirPriceTier_productId_version_idx"
  ON "SouvenirPriceTier"("productId", "version");
