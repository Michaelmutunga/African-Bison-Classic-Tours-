import { NextResponse } from "next/server";
import { dashboardStats } from "@/server/operations";
import { errorResponse, requestActor } from "@/server/http";

export async function GET() {
  try {
    const stats = await dashboardStats(await requestActor());
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    return errorResponse(error);
  }
}
