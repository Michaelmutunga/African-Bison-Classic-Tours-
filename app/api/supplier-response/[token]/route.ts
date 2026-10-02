import { NextResponse } from "next/server";
import { clientIp, throttled } from "@/lib/ratelimit";
import { getSupplierResponseContext, respondToSupplierRequest } from "@/server/workflow";
import { errorResponse, readJson } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    return NextResponse.json({ ok: true, ...(await getSupplierResponseContext(token)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    // Token links are unguessable, but throttle replies against guessing.
    if (throttled(`supplier-response:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    const { token } = await params;
    const result = await respondToSupplierRequest(token, await readJson(request));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
