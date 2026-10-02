import { NextResponse } from "next/server";
import { z } from "zod";
import type { BookingStatus } from "@prisma/client";
import { getBooking, modifyBooking, setBookingStatus } from "@/server/bookings";
import { errorResponse, readJson, requestActor } from "@/server/http";

const statusSchema = z.object({
  status: z.enum([
    "NEW",
    "IN_REVIEW",
    "SUPPLIERS_PENDING",
    "QUOTE_DRAFT",
    "QUOTE_APPROVED",
    "QUOTE_SENT",
    "CLIENT_REVISION",
    "AWAITING_PAYMENT",
    "PARTIALLY_PAID",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
    "REFUND_PENDING",
    "REFUNDED",
  ]),
  reason: z.string().trim().max(500).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const booking = await getBooking(await requestActor(), id);
    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requestActor();
    const body = (await readJson(request)) as Record<string, unknown>;
    if (typeof body.status === "string") {
      const { status, reason } = statusSchema.parse(body);
      const booking = await setBookingStatus(actor, id, status as BookingStatus, reason);
      return NextResponse.json({ ok: true, booking });
    }
    const booking = await modifyBooking(actor, id, body);
    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return errorResponse(error);
  }
}
