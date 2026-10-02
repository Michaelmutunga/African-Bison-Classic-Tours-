import { NextResponse } from "next/server";
import { clientIp, throttled } from "@/lib/ratelimit";
import { submitMarketplaceBooking } from "@/server/submissions";
import { errorResponse, readJson, requestActor } from "@/server/http";

/**
 * Public marketplace submissions: a listed tour (tourSlug/tourId) or a
 * custom design (source CUSTOM + customItinerary). Rate-limited, honeypot
 * guarded, idempotent on idempotencyKey.
 */
export async function POST(request: Request) {
  try {
    if (throttled(`submissions:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    const booking = await submitMarketplaceBooking(await requestActor(), await readJson(request));
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
