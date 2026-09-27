import { NextResponse } from "next/server";
import { createTransfer, listTransfers } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const actor = await requestActor();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const now = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const transfers = await listTransfers(actor, start, end, url.searchParams.get("status") ?? undefined);
    return NextResponse.json({ ok: true, transfers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const transfer = await createTransfer(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, transfer }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
