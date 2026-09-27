import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addTraveller } from "@/server/portal";
import { errorResponse, readJson } from "@/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const traveller = await addTraveller(await currentUser(), reference, await readJson(request));
    return NextResponse.json({ ok: true, traveller }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
