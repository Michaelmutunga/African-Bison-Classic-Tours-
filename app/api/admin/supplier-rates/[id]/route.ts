import { NextResponse } from "next/server";
import { updateSupplierRate } from "@/server/suppliers";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Price changes mint a new version; locks keep their pinned version.
    const rate = await updateSupplierRate(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, rate });
  } catch (error) {
    return errorResponse(error);
  }
}
