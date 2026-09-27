import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { requireBookingAccess } from "@/server/portal";
import { errorResponse } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const booking = await requireBookingAccess(await currentUser(), reference);
    return NextResponse.json({ ok: true, booking });
  } catch (error) {
    return errorResponse(error);
  }
}
