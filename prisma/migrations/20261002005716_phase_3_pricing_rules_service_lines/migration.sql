-- CreateEnum
CREATE TYPE "MarkupScope" AS ENUM ('GLOBAL', 'SERVICE_TYPE', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "MarkupMode" AS ENUM ('PERCENT', 'FIXED');

-- CreateTable
CREATE TABLE "MarkupRule" (
    "id" TEXT NOT NULL,
    "scope" "MarkupScope" NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT '',
    "mode" "MarkupMode" NOT NULL,
    "percentBps" INTEGER,
    "fixedCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxFee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "MarkupMode" NOT NULL,
    "percentBps" INTEGER,
    "fixedCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLine" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "supplierId" TEXT,
    "rateId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pax" INTEGER,
    "unit" "RateUnit" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "costCents" INTEGER NOT NULL,
    "fxRate" DECIMAL(18,6),
    "markupMode" "MarkupMode" NOT NULL,
    "markupBps" INTEGER,
    "markupFixedCents" INTEGER,
    "markupSource" TEXT NOT NULL DEFAULT 'GLOBAL',
    "markupRuleId" TEXT,
    "clientPriceCents" INTEGER NOT NULL,
    "incomeCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarkupRule_scope_active_idx" ON "MarkupRule"("scope", "active");

-- CreateIndex
CREATE UNIQUE INDEX "MarkupRule_scope_scopeKey_key" ON "MarkupRule"("scope", "scopeKey");

-- CreateIndex
CREATE INDEX "TaxFee_active_sortOrder_idx" ON "TaxFee"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceLine_bookingId_idx" ON "ServiceLine"("bookingId");

-- CreateIndex
CREATE INDEX "ServiceLine_supplierId_idx" ON "ServiceLine"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLine_bookingId_seq_key" ON "ServiceLine"("bookingId", "seq");

-- AddForeignKey
ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "SupplierRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
