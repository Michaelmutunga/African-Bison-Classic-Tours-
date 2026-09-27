-- CreateEnum
CREATE TYPE "GroupInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "BookingTraveller" ADD COLUMN     "inviteId" TEXT,
ADD COLUMN     "roomPreference" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expectedTravellers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" "GroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_bookingId_key" ON "Group"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_token_key" ON "GroupInvite"("token");

-- CreateIndex
CREATE INDEX "GroupInvite_groupId_status_idx" ON "GroupInvite"("groupId", "status");

-- CreateIndex
CREATE INDEX "BookingTraveller_inviteId_idx" ON "BookingTraveller"("inviteId");

-- AddForeignKey
ALTER TABLE "BookingTraveller" ADD CONSTRAINT "BookingTraveller_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "GroupInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
