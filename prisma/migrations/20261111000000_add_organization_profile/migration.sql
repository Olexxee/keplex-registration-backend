CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL DEFAULT 'organization-profile',
    "organizationName" VARCHAR(160) NOT NULL DEFAULT 'KPX Academy',
    "tagline" VARCHAR(200),
    "description" TEXT,
    "contactEmail" VARCHAR(254),
    "phone" VARCHAR(40),
    "whatsapp" VARCHAR(40),
    "address" TEXT,
    "operatingHours" TEXT,
    "instagramUrl" VARCHAR(500),
    "facebookUrl" VARCHAR(500),
    "linkedinUrl" VARCHAR(500),
    "tiktokUrl" VARCHAR(500),
    "youtubeUrl" VARCHAR(500),
    "copyrightText" VARCHAR(300),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);
