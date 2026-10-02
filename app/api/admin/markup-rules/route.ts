import { NextResponse } from "next/server";
import { listMarkupRules, upsertMarkupRule } from "@/server/marketplace-pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, rules: await listMarkupRules(await requestActor()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const rule = await upsertMarkupRule(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, rule }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
