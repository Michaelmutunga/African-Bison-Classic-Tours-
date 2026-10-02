import { NextResponse } from "next/server";
import { requestSupplierAvailability } from "@/server/workflow";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await requestSupplierAvailability(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
