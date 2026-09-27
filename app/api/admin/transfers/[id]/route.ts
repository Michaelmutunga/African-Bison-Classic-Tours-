import { NextResponse } from "next/server";
import { updateTransfer } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const transfer = await updateTransfer(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, transfer });
  } catch (error) {
    return errorResponse(error);
  }
}
