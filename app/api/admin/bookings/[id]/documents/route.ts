import { NextResponse } from "next/server";
import { attachDocument } from "@/server/portal";
import { errorResponse, readJson, requestActor } from "@/server/http";

/** Staff attaches a document to a booking. */
export async function POST(request: Request) {
  try {
    const document = await attachDocument(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, document }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
