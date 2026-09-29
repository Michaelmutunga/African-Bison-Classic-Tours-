/*
 * Run the maintenance sweep from the command line (local testing of the
 * Phase-12 reminder/expiry engine without waiting for the scheduler).
 *
 * Usage: npm run sweep
 */
import { sweepExpirations } from "../server/bookings.js";
import { expireQuotes } from "../server/pricing.js";
import {
  sendBalanceReminders,
  sendHoldExpiringReminders,
  sendTripReminders,
} from "../server/notifications/dispatch.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  const [holds, quotes, trips, balances, expiring] = await Promise.all([
    sweepExpirations(),
    expireQuotes(),
    sendTripReminders(),
    sendBalanceReminders(),
    sendHoldExpiringReminders(),
  ]);
  console.log(
    JSON.stringify(
      {
        holdsExpired: holds.holds,
        bookingsExpired: holds.bookings,
        quotesExpired: quotes,
        tripReminders: trips,
        balanceReminders: balances,
        holdExpiringWarnings: expiring,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
