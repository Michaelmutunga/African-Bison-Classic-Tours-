import { NextResponse } from "next/server";
import { z } from "zod";
import { releaseHold, renewHold } from "@/server/bookings";
import { errorResponse, readJson, requestActor } from "@/server/http";

const actionSchema = z.object({
  action: z.enum(["renew", "release"]),
  ttlMinutes: z.number().int().min(5).max(20_160).default(2880),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requestActor();
    const { action, ttlMinutes } = actionSchema.parse(await readJson(request));
    const hold = action === "renew" ? await renewHold(actor, id, ttlMinutes) : await releaseHold(actor, id);
    return NextResponse.json({ ok: true, hold });
  } catch (error) {
    return errorResponse(error);
  }
}
