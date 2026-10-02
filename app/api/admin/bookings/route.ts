import { NextResponse } from "next/server";
import type { BookingStatus } from "@prisma/client";
import { listBookings } from "@/server/bookings";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as BookingStatus | null;
    const search = url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined;
    const bookings = await listBookings(await requestActor(), status ?? undefined, search);
    return NextResponse.json({ ok: true, bookings });
  } catch (error) {
    return errorResponse(error);
  }
}
