import { NextResponse } from "next/server";
import { refundPayment } from "@/server/payments";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await readJson(request)) as Record<string, unknown>;
    const refund = await refundPayment(await requestActor(), { ...body, paymentId: id });
    return NextResponse.json({ ok: true, refund }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
