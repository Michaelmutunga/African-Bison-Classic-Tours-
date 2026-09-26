import { NextResponse } from "next/server";
import { listPayments } from "@/server/payments";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const bookingId = new URL(request.url).searchParams.get("bookingId") ?? undefined;
    const payments = await listPayments(await requestActor(), bookingId);
    return NextResponse.json({ ok: true, payments });
  } catch (error) {
    return errorResponse(error);
  }
}
