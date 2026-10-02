import { NextResponse } from "next/server";
import { bookingPricingSummary } from "@/server/marketplace-pricing";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, ...(await bookingPricingSummary(await requestActor(), id)) });
  } catch (error) {
    return errorResponse(error);
  }
}
