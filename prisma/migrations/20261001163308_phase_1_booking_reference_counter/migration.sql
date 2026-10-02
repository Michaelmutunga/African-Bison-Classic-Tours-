-- CreateTable
CREATE TABLE "BookingDailyCounter" (
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingDailyCounter_pkey" PRIMARY KEY ("date")
);
