import { NextResponse } from "next/server";
import { createGuide, listGuides } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return NextResponse.json({ ok: true, guides: await listGuides(await requestActor(), status) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const guide = await createGuide(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, guide }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
