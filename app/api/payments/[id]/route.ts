import { NextResponse } from "next/server";
import { getPayment } from "@/server/payments";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const email = new URL(request.url).searchParams.get("email") ?? undefined;
    const payment = await getPayment(await requestActor(), id, email);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    return errorResponse(error);
  }
}
