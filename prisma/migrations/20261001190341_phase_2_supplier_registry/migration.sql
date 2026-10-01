-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'PAUSED', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('PER_VEHICLE_PER_DAY', 'PER_PERSON_PER_NIGHT', 'PER_TRANSFER', 'PER_ACTIVITY', 'PER_GROUP');

-- CreateEnum
CREATE TYPE "SupplierLockStatus" AS ENUM ('REQUESTED', 'HELD', 'CONFIRMED', 'DECLINED', 'RELEASED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DUE', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "SupplierType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "coverageAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "rating" INTEGER,
    "notes" TEXT,
    "paymentTerms" TEXT,
    "payoutCiphertext" TEXT,
    "payoutHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDocument" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierRate" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "serviceSlug" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "unit" "RateUnit" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "costCents" INTEGER NOT NULL,
    "season" TEXT,
    "seasonStart" TEXT,
    "seasonEnd" TEXT,
    "capacity" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLock" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "rateId" TEXT,
    "bookingRef" TEXT,
    "serviceRef" TEXT,
    "serviceName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "SupplierLockStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "lockId" TEXT,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayout" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bookingRef" TEXT,
    "lockId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'DUE',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SupplierTypes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SupplierTypes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierType_slug_key" ON "SupplierType"("slug");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "SupplierDocument_supplierId_idx" ON "SupplierDocument"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierRate_supplierId_serviceSlug_idx" ON "SupplierRate"("supplierId", "serviceSlug");

-- CreateIndex
CREATE INDEX "SupplierRate_serviceType_idx" ON "SupplierRate"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierRate_supplierId_serviceSlug_version_key" ON "SupplierRate"("supplierId", "serviceSlug", "version");

-- CreateIndex
CREATE INDEX "SupplierLock_supplierId_status_idx" ON "SupplierLock"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierLock_supplierId_startsAt_endsAt_idx" ON "SupplierLock"("supplierId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "SupplierLock_bookingRef_idx" ON "SupplierLock"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierToken_tokenHash_key" ON "SupplierToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SupplierToken_lockId_idx" ON "SupplierToken"("lockId");

-- CreateIndex
CREATE INDEX "SupplierToken_expiresAt_idx" ON "SupplierToken"("expiresAt");

-- CreateIndex
CREATE INDEX "SupplierPayout_supplierId_status_idx" ON "SupplierPayout"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierPayout_bookingRef_idx" ON "SupplierPayout"("bookingRef");

-- CreateIndex
CREATE INDEX "_SupplierTypes_B_index" ON "_SupplierTypes"("B");

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRate" ADD CONSTRAINT "SupplierRate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierRate" ADD CONSTRAINT "SupplierRate_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "SupplierRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLock" ADD CONSTRAINT "SupplierLock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLock" ADD CONSTRAINT "SupplierLock_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "SupplierRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierToken" ADD CONSTRAINT "SupplierToken_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "SupplierLock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayout" ADD CONSTRAINT "SupplierPayout_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SupplierTypes" ADD CONSTRAINT "_SupplierTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SupplierTypes" ADD CONSTRAINT "_SupplierTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "SupplierType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
