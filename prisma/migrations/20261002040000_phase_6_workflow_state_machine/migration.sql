-- Phase 6 workflow: legacy statuses remapped inside the enum cast
-- (INQUIRY→NEW, HOLD→SUPPLIERS_PENDING, AWAITING_DEPOSIT→AWAITING_PAYMENT,
-- PRE_TRIP→CONFIRMED, ON_SAFARI→IN_PROGRESS), retired values dropped,
-- QuoteVersion + lock reply fields added.
-- Reversible: re-add the old enum values and UPDATE rows back using
-- BookingStatusHistory (every remapped row keeps its full history).

-- Recreate the enum; the USING clause remaps legacy rows inline so this
-- applies cleanly to empty (shadow) and populated databases alike.
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
CREATE TYPE "BookingStatus" AS ENUM ('NEW', 'IN_REVIEW', 'SUPPLIERS_PENDING', 'QUOTE_DRAFT', 'QUOTE_APPROVED', 'QUOTE_SENT', 'CLIENT_REVISION', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED');
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus" USING (
  CASE "status"::text
    WHEN 'INQUIRY' THEN 'NEW'
    WHEN 'HOLD' THEN 'SUPPLIERS_PENDING'
    WHEN 'AWAITING_DEPOSIT' THEN 'AWAITING_PAYMENT'
    WHEN 'PRE_TRIP' THEN 'CONFIRMED'
    WHEN 'ON_SAFARI' THEN 'IN_PROGRESS'
    ELSE "status"::text
  END::"BookingStatus"
);
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'NEW';
ALTER TABLE "BookingStatusHistory" ALTER COLUMN "from" TYPE "BookingStatus" USING (
  CASE "from"::text
    WHEN 'INQUIRY' THEN 'NEW'
    WHEN 'HOLD' THEN 'SUPPLIERS_PENDING'
    WHEN 'AWAITING_DEPOSIT' THEN 'AWAITING_PAYMENT'
    WHEN 'PRE_TRIP' THEN 'CONFIRMED'
    WHEN 'ON_SAFARI' THEN 'IN_PROGRESS'
    ELSE "from"::text
  END::"BookingStatus"
);
ALTER TABLE "BookingStatusHistory" ALTER COLUMN "to" TYPE "BookingStatus" USING (
  CASE "to"::text
    WHEN 'INQUIRY' THEN 'NEW'
    WHEN 'HOLD' THEN 'SUPPLIERS_PENDING'
    WHEN 'AWAITING_DEPOSIT' THEN 'AWAITING_PAYMENT'
    WHEN 'PRE_TRIP' THEN 'CONFIRMED'
    WHEN 'ON_SAFARI' THEN 'IN_PROGRESS'
    ELSE "to"::text
  END::"BookingStatus"
);
DROP TYPE "BookingStatus_old";

-- CreateEnum
CREATE TYPE "QuoteVersionStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'ACCEPTED', 'REVISION_REQUESTED', 'EXPIRED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "QuoteVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lines" JSONB NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxes" JSONB,
    "taxTotalCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL,
    "fxRates" JSONB,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "paymentTerms" TEXT,
    "cancellationTerms" TEXT,
    "notes" TEXT,
    "revisionNotes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_bookingId_version_key" ON "QuoteVersion"("bookingId", "version");
CREATE INDEX "QuoteVersion_bookingId_status_idx" ON "QuoteVersion"("bookingId", "status");

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (supplier replies)
ALTER TABLE "SupplierLock" ADD COLUMN "counterOfferCents" INTEGER,
ADD COLUMN "counterCurrency" TEXT,
ADD COLUMN "responseNote" TEXT,
ADD COLUMN "respondedAt" TIMESTAMP(3);
