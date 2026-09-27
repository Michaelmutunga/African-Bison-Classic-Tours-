import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { removeTraveller, updateTraveller } from "@/server/portal";
import { errorResponse, readJson } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const traveller = await updateTraveller(await currentUser(), id, await readJson(request));
    return NextResponse.json({ ok: true, traveller });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await removeTraveller(await currentUser(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
