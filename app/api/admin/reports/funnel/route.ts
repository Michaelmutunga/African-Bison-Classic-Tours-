import { NextResponse } from "next/server";
import { funnelReport } from "@/server/reports";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const funnel = await funnelReport(await requestActor(), {
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ ok: true, ...funnel });
  } catch (error) {
    return errorResponse(error);
  }
}
