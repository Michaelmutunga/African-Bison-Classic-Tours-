import { NextResponse } from "next/server";
import { clientIp, throttled } from "@/lib/ratelimit";
import { createBooking } from "@/server/bookings";
import { errorResponse, readJson, requestActor } from "@/server/http";

/** Guest checkout: creates a booking without an account (Phase 8 adds accounts). */
export async function POST(request: Request) {
  try {
    if (throttled(`bookings:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    const booking = await createBooking(await requestActor(), await readJson(request));
    return NextResponse.json(
      {
        ok: true,
        reference: booking.reference,
        status: booking.status,
        totalCents: booking.totalCents,
        currency: booking.currency,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
