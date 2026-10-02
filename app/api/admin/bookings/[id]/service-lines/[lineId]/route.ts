import { NextResponse } from "next/server";
import { removeServiceLine, updateServiceLine } from "@/server/marketplace-pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  try {
    const { lineId } = await params;
    const line = await updateServiceLine(await requestActor(), lineId, await readJson(request));
    return NextResponse.json({ ok: true, line });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  try {
    const { lineId } = await params;
    await removeServiceLine(await requestActor(), lineId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
