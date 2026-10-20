CREATE TYPE "SiteContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "HomepageHero" (
  "id" TEXT NOT NULL,
  "eyebrow" TEXT,
  "heading" TEXT NOT NULL,
  "highlightText" TEXT,
  "description" TEXT NOT NULL,
  "primaryCtaLabel" TEXT,
  "primaryCtaUrl" TEXT,
  "secondaryCtaLabel" TEXT,
  "secondaryCtaUrl" TEXT,
  "imageUrl" TEXT,
  "imagePublicId" TEXT,
  "imageAltText" TEXT,
  "status" "SiteContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomepageHero_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HomepageHero_status_publishedAt_idx" ON "HomepageHero"("status", "publishedAt");

CREATE TABLE "GalleryCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GalleryCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GalleryCategory_slug_key" ON "GalleryCategory"("slug");
CREATE INDEX "GalleryCategory_active_displayOrder_idx" ON "GalleryCategory"("active", "displayOrder");

CREATE TABLE "GalleryImage" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "altText" TEXT NOT NULL,
  "caption" TEXT,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" "SiteContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GalleryImage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GalleryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GalleryImage_categoryId_status_displayOrder_idx" ON "GalleryImage"("categoryId", "status", "displayOrder");
CREATE INDEX "GalleryImage_status_featured_displayOrder_idx" ON "GalleryImage"("status", "featured", "displayOrder");

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT NOT NULL,
  "filePublicId" TEXT NOT NULL,
  "fileResourceType" TEXT NOT NULL DEFAULT 'image',
  "fileFormat" TEXT NOT NULL DEFAULT 'pdf',
  "fileBytes" INTEGER NOT NULL,
  "pageCount" INTEGER,
  "coverImageUrl" TEXT,
  "coverImagePublicId" TEXT,
  "trainingProgramId" TEXT,
  "status" "SiteContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Resource_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
CREATE INDEX "Resource_status_publishedAt_idx" ON "Resource"("status", "publishedAt");
CREATE INDEX "Resource_trainingProgramId_status_idx" ON "Resource"("trainingProgramId", "status");
