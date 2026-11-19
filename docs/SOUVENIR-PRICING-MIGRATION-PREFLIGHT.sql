-- READ-ONLY preflight for the souvenir pricing schedule migration.
-- Run against a restored/non-production copy first. No statement mutates data.

-- 1. Core souvenir inventory.
SELECT 'SouvenirProduct' AS table_name, COUNT(*)::bigint AS row_count FROM "SouvenirProduct"
UNION ALL SELECT 'SouvenirPriceTier', COUNT(*)::bigint FROM "SouvenirPriceTier"
UNION ALL SELECT 'SouvenirOrder', COUNT(*)::bigint FROM "SouvenirOrder"
UNION ALL SELECT 'Payment (souvenir-linked)', COUNT(*)::bigint FROM "Payment" WHERE "souvenirOrderId" IS NOT NULL
UNION ALL SELECT 'SouvenirProductMedia', COUNT(*)::bigint FROM "SouvenirProductMedia"
UNION ALL SELECT 'SouvenirColorOption', COUNT(*)::bigint FROM "SouvenirColorOption"
UNION ALL SELECT 'SouvenirEnquiry', COUNT(*)::bigint FROM "SouvenirEnquiry"
UNION ALL SELECT 'SouvenirQuote', COUNT(*)::bigint FROM "SouvenirQuote";

-- 2. Legacy tier ambiguity and invalid row-level data.
SELECT COUNT(*) AS total_tiers,
 COUNT(*) FILTER (WHERE "active") AS active_tiers,
 COUNT(*) FILTER (WHERE NOT "active") AS inactive_tiers,
 COUNT(*) FILTER (WHERE "maxQuantity" IS NULL) AS open_ended_tiers,
 COUNT(*) FILTER (WHERE "unitPrice" IS NULL) AS missing_unit_price,
 COUNT(*) FILTER (WHERE "minQuantity" < 1) AS invalid_minimum,
 COUNT(*) FILTER (WHERE "maxQuantity" IS NOT NULL AND "maxQuantity" < "minQuantity") AS invalid_bounds
FROM "SouvenirPriceTier";

-- 3. Product-level review queue. Do not infer range boundaries from labels.
SELECT p."id", p."name", p."slug", p."active" AS product_active,
 COUNT(DISTINCT t."id") AS tier_count,
 COUNT(DISTINCT t."id") FILTER (WHERE t."active") AS active_tier_count,
 COUNT(DISTINCT t."id") FILTER (WHERE t."maxQuantity" IS NULL) AS open_ended_tier_count,
 COUNT(DISTINCT o."id") AS order_count
FROM "SouvenirProduct" p
LEFT JOIN "SouvenirPriceTier" t ON t."productId" = p."id"
LEFT JOIN "SouvenirOrder" o ON o."productId" = p."id"
GROUP BY p."id", p."name", p."slug", p."active" ORDER BY p."name";

-- 4. Existing overlapping active tiers (inclusive bounds; NULL is unbounded).
SELECT a."productId", a."id" AS tier_a_id, a."label" AS tier_a_label,
 a."minQuantity" AS tier_a_min, a."maxQuantity" AS tier_a_max,
 b."id" AS tier_b_id, b."label" AS tier_b_label,
 b."minQuantity" AS tier_b_min, b."maxQuantity" AS tier_b_max
FROM "SouvenirPriceTier" a JOIN "SouvenirPriceTier" b
 ON b."productId" = a."productId" AND b."id" > a."id"
 AND a."active" AND b."active"
 AND a."minQuantity" <= COALESCE(b."maxQuantity", 2147483647)
 AND b."minQuantity" <= COALESCE(a."maxQuantity", 2147483647)
ORDER BY a."productId", a."minQuantity";

-- 5. Order snapshot and payment reconciliation baselines.
SELECT COUNT(*) AS total_orders,
 COUNT(*) FILTER (WHERE "priceTierId" IS NOT NULL) AS orders_with_tier_reference,
 COUNT(*) FILTER (WHERE "unitPriceSnapshot" IS NULL) AS orders_missing_unit_price_snapshot,
 COUNT(*) FILTER (WHERE "priceTierLabelSnapshot" IS NULL OR BTRIM("priceTierLabelSnapshot") = '') AS orders_missing_tier_label,
 COALESCE(SUM("totalPriceSnapshot"), 0) AS order_total_snapshot_sum
FROM "SouvenirOrder";

SELECT p."currency", p."status", COUNT(*) AS payment_count,
 COALESCE(SUM(p."amount"), 0) AS payment_amount_sum
FROM "Payment" p WHERE p."souvenirOrderId" IS NOT NULL
GROUP BY p."currency", p."status" ORDER BY p."currency", p."status";

-- 6. Order references that do not resolve to a preserved tier row.
SELECT o."id", o."publicReference", o."priceTierId", o."priceTierLabelSnapshot",
 o."quantity", o."unitPriceSnapshot", o."totalPriceSnapshot"
FROM "SouvenirOrder" o LEFT JOIN "SouvenirPriceTier" t ON t."id" = o."priceTierId"
WHERE o."priceTierId" IS NOT NULL AND t."id" IS NULL;
