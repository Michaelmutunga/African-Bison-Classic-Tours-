import { NextResponse } from "next/server";
import { getSupplier, updateSupplier } from "@/server/suppliers";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, supplier: await getSupplier(await requestActor(), id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supplier = await updateSupplier(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, supplier });
  } catch (error) {
    return errorResponse(error);
  }
}
