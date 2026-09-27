/*
  Warnings:

  - Added the required column `updatedAt` to the `BookingTraveller` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BookingTraveller" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "dietaryNotes" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "medicalNotes" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "passportExpiry" TIMESTAMP(3),
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "CustomerMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorRole" TEXT NOT NULL DEFAULT 'customer',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "body" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerMessage_bookingId_createdAt_idx" ON "CustomerMessage"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_bookingId_idx" ON "Document"("bookingId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- AddForeignKey
ALTER TABLE "CustomerMessage" ADD CONSTRAINT "CustomerMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
