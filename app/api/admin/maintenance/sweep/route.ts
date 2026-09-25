import { NextResponse } from "next/server";
import { expireQuotes } from "@/server/pricing";
import { sweepExpirations } from "@/server/bookings";
import { errorResponse, requestActor } from "@/server/http";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

/** Expiry sweeps (holds, bookings, quotes). A scheduler calls this in production. */
export async function POST() {
  try {
    const actor = await requestActor();
    if (!actor) throw new UnauthorizedError();
    if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    const [holds, quotes] = await Promise.all([sweepExpirations(), expireQuotes()]);
    return NextResponse.json({ ok: true, holds: holds.holds, bookings: holds.bookings, quotes });
  } catch (error) {
    return errorResponse(error);
  }
}
