import { NextResponse } from "next/server";
import { addServiceLine, listServiceLines } from "@/server/marketplace-pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, lines: await listServiceLines(await requestActor(), id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const line = await addServiceLine(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, line }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
