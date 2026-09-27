import { NextResponse } from "next/server";
import { createMedia, listMedia } from "@/server/content-admin";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, media: await listMedia(await requestActor()) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const asset = await createMedia(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, asset }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
