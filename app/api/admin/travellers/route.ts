import { NextResponse } from "next/server";
import { listTravellers } from "@/server/operations";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const travellers = await listTravellers(await requestActor(), {
      search: url.searchParams.get("search") ?? undefined,
      bookingId: url.searchParams.get("bookingId") ?? undefined,
    });
    return NextResponse.json({ ok: true, travellers });
  } catch (error) {
    return errorResponse(error);
  }
}
