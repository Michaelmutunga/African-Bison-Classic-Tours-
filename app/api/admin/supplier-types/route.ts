import { NextResponse } from "next/server";
import { createSupplierType, listSupplierTypes } from "@/server/suppliers";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const activeOnly = new URL(request.url).searchParams.get("active") === "1";
    return NextResponse.json({ ok: true, types: await listSupplierTypes(await requestActor(), activeOnly) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const type = await createSupplierType(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, type }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
