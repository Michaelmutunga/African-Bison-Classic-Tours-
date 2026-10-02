import { NextResponse } from "next/server";
import { outstandingClients, outstandingPayouts } from "@/server/reports";
import { errorResponse, requestActor } from "@/server/http";

export async function GET() {
  try {
    const actor = await requestActor();
    const [clients, payouts] = await Promise.all([outstandingClients(actor), outstandingPayouts(actor)]);
    return NextResponse.json({ ok: true, clients, payouts });
  } catch (error) {
    return errorResponse(error);
  }
}
