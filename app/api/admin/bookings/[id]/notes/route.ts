import { NextResponse } from "next/server";
import { z } from "zod";
import { addInternalNote, listInternalNotes } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notes = await listInternalNotes(await requestActor(), id);
    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { body } = z.object({ body: z.string() }).parse(await readJson(request));
    const note = await addInternalNote(await requestActor(), id, body);
    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
