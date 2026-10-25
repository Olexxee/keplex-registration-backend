-- CreateEnum
CREATE TYPE "SouvenirOrderStatus" AS ENUM ('SUBMITTED', 'AWAITING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'READY', 'FULFILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SouvenirEnquiryStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'RESPONDED', 'ACCEPTED', 'DECLINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SouvenirQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "SouvenirProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "bookingTerms" TEXT,
    "productionLeadTimeDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirColorOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" VARCHAR(7) NOT NULL,
    "swatchImageUrl" TEXT,
    "swatchPublicId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirColorOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirPriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirOrder" (
    "id" TEXT NOT NULL,
    "publicReference" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerWhatsApp" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceTierId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "priceTierLabelSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "bookingTermsSnapshot" TEXT,
    "productionLeadTimeDaysSnapshot" INTEGER,
    "status" "SouvenirOrderStatus" NOT NULL DEFAULT 'SUBMITTED',
    "customerNotes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirOrderColor" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "colorOptionId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "colorHexSnapshot" TEXT NOT NULL,
    "swatchImageUrlSnapshot" TEXT,
    "quantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SouvenirOrderColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirEnquiry" (
    "id" TEXT NOT NULL,
    "publicReference" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerWhatsApp" TEXT NOT NULL,
    "productId" TEXT,
    "requestedQuantity" INTEGER,
    "designDescription" TEXT NOT NULL,
    "status" "SouvenirEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirEnquiryMedia" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SouvenirEnquiryMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirQuote" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "SouvenirQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "terms" TEXT,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SouvenirQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirQuoteMedia" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SouvenirQuoteMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirProduct_slug_key" ON "SouvenirProduct"("slug");

-- CreateIndex
CREATE INDEX "SouvenirProduct_active_displayOrder_idx" ON "SouvenirProduct"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "SouvenirProduct_featured_displayOrder_idx" ON "SouvenirProduct"("featured", "displayOrder");

-- CreateIndex
CREATE INDEX "SouvenirProductMedia_productId_sortOrder_idx" ON "SouvenirProductMedia"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "SouvenirProductMedia_productId_isPrimary_idx" ON "SouvenirProductMedia"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "SouvenirColorOption_productId_active_displayOrder_idx" ON "SouvenirColorOption"("productId", "active", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirColorOption_productId_name_key" ON "SouvenirColorOption"("productId", "name");

-- CreateIndex
CREATE INDEX "SouvenirPriceTier_productId_active_minQuantity_idx" ON "SouvenirPriceTier"("productId", "active", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirOrder_publicReference_key" ON "SouvenirOrder"("publicReference");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirOrder_accessTokenHash_key" ON "SouvenirOrder"("accessTokenHash");

-- CreateIndex
CREATE INDEX "SouvenirOrder_status_createdAt_idx" ON "SouvenirOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SouvenirOrder_customerEmail_idx" ON "SouvenirOrder"("customerEmail");

-- CreateIndex
CREATE INDEX "SouvenirOrder_customerWhatsApp_idx" ON "SouvenirOrder"("customerWhatsApp");

-- CreateIndex
CREATE INDEX "SouvenirOrderColor_orderId_idx" ON "SouvenirOrderColor"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirOrderColor_orderId_nameSnapshot_key" ON "SouvenirOrderColor"("orderId", "nameSnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirEnquiry_publicReference_key" ON "SouvenirEnquiry"("publicReference");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirEnquiry_accessTokenHash_key" ON "SouvenirEnquiry"("accessTokenHash");

-- CreateIndex
CREATE INDEX "SouvenirEnquiry_status_createdAt_idx" ON "SouvenirEnquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SouvenirEnquiry_customerEmail_idx" ON "SouvenirEnquiry"("customerEmail");

-- CreateIndex
CREATE INDEX "SouvenirEnquiry_customerWhatsApp_idx" ON "SouvenirEnquiry"("customerWhatsApp");

-- CreateIndex
CREATE INDEX "SouvenirEnquiryMedia_enquiryId_createdAt_idx" ON "SouvenirEnquiryMedia"("enquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "SouvenirQuote_enquiryId_status_createdAt_idx" ON "SouvenirQuote"("enquiryId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SouvenirQuote_status_expiresAt_idx" ON "SouvenirQuote"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirQuote_enquiryId_version_key" ON "SouvenirQuote"("enquiryId", "version");

-- CreateIndex
CREATE INDEX "SouvenirQuoteItem_quoteId_displayOrder_idx" ON "SouvenirQuoteItem"("quoteId", "displayOrder");

-- CreateIndex
CREATE INDEX "SouvenirQuoteMedia_quoteId_createdAt_idx" ON "SouvenirQuoteMedia"("quoteId", "createdAt");

-- AddForeignKey
ALTER TABLE "SouvenirProductMedia" ADD CONSTRAINT "SouvenirProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SouvenirProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirColorOption" ADD CONSTRAINT "SouvenirColorOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SouvenirProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirPriceTier" ADD CONSTRAINT "SouvenirPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SouvenirProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirOrder" ADD CONSTRAINT "SouvenirOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SouvenirProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirOrderColor" ADD CONSTRAINT "SouvenirOrderColor_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SouvenirOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirOrderColor" ADD CONSTRAINT "SouvenirOrderColor_colorOptionId_fkey" FOREIGN KEY ("colorOptionId") REFERENCES "SouvenirColorOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirEnquiry" ADD CONSTRAINT "SouvenirEnquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SouvenirProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirEnquiryMedia" ADD CONSTRAINT "SouvenirEnquiryMedia_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "SouvenirEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirQuote" ADD CONSTRAINT "SouvenirQuote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "SouvenirEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirQuoteItem" ADD CONSTRAINT "SouvenirQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "SouvenirQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirQuoteMedia" ADD CONSTRAINT "SouvenirQuoteMedia_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "SouvenirQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
