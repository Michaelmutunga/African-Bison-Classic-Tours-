import { NextResponse } from "next/server";
import { proposeServiceLines } from "@/server/workflow";
import { errorResponse, requestActor } from "@/server/http";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await proposeServiceLines(await requestActor(), id);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
