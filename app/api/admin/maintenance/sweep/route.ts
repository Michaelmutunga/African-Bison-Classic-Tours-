import { NextResponse } from "next/server";
import { expireQuotes } from "@/server/pricing";
import { sweepExpirations } from "@/server/bookings";
import { sendBalanceReminders, sendHoldExpiringReminders, sendTripReminders } from "@/server/notifications/dispatch";
import { runWorkflowSweep } from "@/server/workflow";
import { errorResponse, requestActor } from "@/server/http";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

/** Expiry sweeps (holds, bookings, quotes) plus customer reminders.
 * A scheduler calls this in production; dedupe keys make repeats safe. */
export async function POST() {
  try {
    const actor = await requestActor();
    if (!actor) throw new UnauthorizedError();
    if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    const [holds, quotes, tripReminders, balanceReminders, holdExpiring, workflow] = await Promise.all([
      sweepExpirations(),
      expireQuotes(),
      sendTripReminders(),
      sendBalanceReminders(),
      sendHoldExpiringReminders(),
      runWorkflowSweep(),
    ]);
    return NextResponse.json({
      ok: true,
      holds: holds.holds,
      bookings: holds.bookings,
      quotes,
      tripReminders,
      balanceReminders,
      holdExpiring,
      quoteVersionsExpired: workflow.expired.versions,
      quoteBookingsExpired: workflow.expired.bookings,
      supplierLocksReleased: workflow.expired.locks,
      quoteWarnings: workflow.warned,
      preTripClient: workflow.reminders.sevenDay,
      preTripSupplier: workflow.reminders.supplierDay,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
