import { NextResponse } from "next/server";
import { listTaxFees, upsertTaxFee } from "@/server/marketplace-pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const activeOnly = new URL(request.url).searchParams.get("active") === "1";
    return NextResponse.json({ ok: true, taxes: await listTaxFees(await requestActor(), activeOnly) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const tax = await upsertTaxFee(await requestActor(), null, await readJson(request));
    return NextResponse.json({ ok: true, tax }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
