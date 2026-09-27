import { NextResponse } from "next/server";
import { listAuditLogs } from "@/server/operations";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const logs = await listAuditLogs(await requestActor(), {
      resource: url.searchParams.get("resource") ?? undefined,
      take: Math.min(Number(url.searchParams.get("take") ?? 100) || 100, 200),
    });
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return errorResponse(error);
  }
}
