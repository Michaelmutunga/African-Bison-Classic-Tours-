import { NextResponse } from "next/server";
import { assignGuide } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assignment = await assignGuide(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, assignment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
