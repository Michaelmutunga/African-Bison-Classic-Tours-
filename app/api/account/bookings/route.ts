import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listMyBookings } from "@/server/portal";
import { errorResponse } from "@/server/http";

export async function GET() {
  try {
    const bookings = await listMyBookings(await currentUser());
    return NextResponse.json({ ok: true, bookings });
  } catch (error) {
    return errorResponse(error);
  }
}
