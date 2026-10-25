ALTER TABLE "HomepageHero" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "HomepageHero_status_displayOrder_publishedAt_idx" ON "HomepageHero"("status", "displayOrder", "publishedAt");
