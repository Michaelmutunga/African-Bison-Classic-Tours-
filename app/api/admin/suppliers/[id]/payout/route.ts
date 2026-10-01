import { NextResponse } from "next/server";
import { revealSupplierPayout } from "@/server/suppliers";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, ...(await revealSupplierPayout(await requestActor(), id)) });
  } catch (error) {
    return errorResponse(error);
  }
}
