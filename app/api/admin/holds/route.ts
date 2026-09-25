import { NextResponse } from "next/server";
import { z } from "zod";
import { createHold } from "@/server/bookings";
import { errorResponse, readJson, requestActor } from "@/server/http";

const holdSchema = z.object({
  bookingId: z.string().cuid(),
  resourceType: z.string().trim().min(2).max(60),
  resourceId: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(50).default(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(1000),
  ttlMinutes: z.number().int().min(5).max(20_160).default(2880),
});

export async function POST(request: Request) {
  try {
    const hold = await createHold(await requestActor(), holdSchema.parse(await readJson(request)));
    return NextResponse.json({ ok: true, hold }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
