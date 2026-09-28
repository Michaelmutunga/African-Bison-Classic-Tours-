import { NextResponse } from "next/server";
import { expireQuotes } from "@/server/pricing";
import { sweepExpirations } from "@/server/bookings";
import { sendBalanceReminders, sendHoldExpiringReminders, sendTripReminders } from "@/server/notifications/dispatch";
import { errorResponse, requestActor } from "@/server/http";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

/** Expiry sweeps (holds, bookings, quotes) plus customer reminders.
 * A scheduler calls this in production; dedupe keys make repeats safe. */
export async function POST() {
  try {
    const actor = await requestActor();
    if (!actor) throw new UnauthorizedError();
    if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    const [holds, quotes, tripReminders, balanceReminders, holdExpiring] = await Promise.all([
      sweepExpirations(),
      expireQuotes(),
      sendTripReminders(),
      sendBalanceReminders(),
      sendHoldExpiringReminders(),
    ]);
    return NextResponse.json({
      ok: true,
      holds: holds.holds,
      bookings: holds.bookings,
      quotes,
      tripReminders,
      balanceReminders,
      holdExpiring,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
