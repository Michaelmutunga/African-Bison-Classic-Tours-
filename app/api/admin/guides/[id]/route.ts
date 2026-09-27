import { NextResponse } from "next/server";
import { deleteGuide, updateGuide } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guide = await updateGuide(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, guide });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteGuide(await requestActor(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
