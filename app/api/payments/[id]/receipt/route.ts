import { NextResponse } from "next/server";
import { receiptData } from "@/server/payments";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const email = new URL(request.url).searchParams.get("email") ?? undefined;
    const receipt = await receiptData(await requestActor(), id, email);
    return NextResponse.json({ ok: true, receipt });
  } catch (error) {
    return errorResponse(error);
  }
}
