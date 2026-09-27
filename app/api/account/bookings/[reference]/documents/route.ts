import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listDocuments } from "@/server/portal";
import { errorResponse } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const documents = await listDocuments(await currentUser(), reference);
    return NextResponse.json({ ok: true, documents });
  } catch (error) {
    return errorResponse(error);
  }
}
