import { NextResponse } from "next/server";
import { createSupplierRate, listSupplierRates } from "@/server/suppliers";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentOnly = new URL(request.url).searchParams.get("history") !== "1";
    return NextResponse.json({ ok: true, rates: await listSupplierRates(await requestActor(), id, currentOnly) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rate = await createSupplierRate(await requestActor(), id, await readJson(request));
    return NextResponse.json({ ok: true, rate }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
