import { NextResponse } from "next/server";
import { generateQuoteDraft } from "@/server/workflow";
import { errorResponse, requestActor } from "@/server/http";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { version, diff } = await generateQuoteDraft(await requestActor(), id);
    return NextResponse.json({ ok: true, version, diff }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
