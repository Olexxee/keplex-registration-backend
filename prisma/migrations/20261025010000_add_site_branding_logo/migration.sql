CREATE TABLE "SiteBranding" (
    "id" TEXT NOT NULL DEFAULT 'site-branding',
    "logoUrl" TEXT,
    "logoPublicId" TEXT,
    "logoAltText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteBranding_pkey" PRIMARY KEY ("id")
);
