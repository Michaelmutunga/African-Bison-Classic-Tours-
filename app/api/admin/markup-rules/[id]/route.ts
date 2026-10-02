import { NextResponse } from "next/server";
import { deleteMarkupRule } from "@/server/marketplace-pricing";
import { errorResponse, requestActor } from "@/server/http";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteMarkupRule(await requestActor(), id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
