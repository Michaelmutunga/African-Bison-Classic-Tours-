import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelBooking } from "@/server/bookings";
import { errorResponse, readJson, requestActor } from "@/server/http";

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  // Guest path: the booking email proves ownership.
  email: z.string().trim().email().max(254).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = cancelSchema.parse(await readJson(request).catch(() => ({})));
    const booking = await cancelBooking(await requestActor(), id, body.reason, body.email);
    return NextResponse.json({ ok: true, status: booking.status, reference: booking.reference });
  } catch (error) {
    return errorResponse(error);
  }
}
