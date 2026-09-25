import { NextResponse } from "next/server";
import { updateActivity } from "@/server/catalogue";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const activity = await updateActivity(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, activity });
  } catch (error) {
    return errorResponse(error);
  }
}
