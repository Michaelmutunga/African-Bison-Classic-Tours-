import { NextResponse } from "next/server";
import { updateDestination } from "@/server/catalogue";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const destination = await updateDestination(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, destination });
  } catch (error) {
    return errorResponse(error);
  }
}
