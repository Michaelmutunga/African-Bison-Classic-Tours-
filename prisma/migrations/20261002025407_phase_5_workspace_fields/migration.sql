-- CreateEnum
CREATE TYPE "BookingPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "assignedAdminId" TEXT,
ADD COLUMN     "priority" "BookingPriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "ServiceLine" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "lockId" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_lockId_fkey" FOREIGN KEY ("lockId") REFERENCES "SupplierLock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
