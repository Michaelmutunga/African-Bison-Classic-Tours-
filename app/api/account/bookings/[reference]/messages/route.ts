import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listMessages, postMessage } from "@/server/portal";
import { errorResponse, readJson } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const messages = await listMessages(await currentUser(), reference);
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const message = await postMessage(await currentUser(), reference, await readJson(request));
    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
