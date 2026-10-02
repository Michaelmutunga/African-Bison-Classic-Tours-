-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('TOUR', 'CUSTOM');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'NEW';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "accommodationTier" TEXT,
ADD COLUMN     "airport" TEXT,
ADD COLUMN     "arrivalFlight" TEXT,
ADD COLUMN     "budgetRange" TEXT,
ADD COLUMN     "childrenAges" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "contactChannel" TEXT,
ADD COLUMN     "customItinerary" JSONB,
ADD COLUMN     "departureFlight" TEXT,
ADD COLUMN     "flexibleDates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "occasion" TEXT,
ADD COLUMN     "pickupLocation" TEXT,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'TOUR',
ADD COLUMN     "specialRequests" TEXT;
