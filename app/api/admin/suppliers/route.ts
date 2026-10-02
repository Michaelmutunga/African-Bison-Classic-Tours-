import { NextResponse } from "next/server";
import type { SupplierStatus } from "@prisma/client";
import { createSupplier, listSuppliers } from "@/server/suppliers";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const suppliers = await listSuppliers(await requestActor(), {
      status: (url.searchParams.get("status") as SupplierStatus | null) ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      search: url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ ok: true, suppliers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supplier = await createSupplier(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, supplier }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
