import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { revokeInvite } from "@/server/groups";
import { errorResponse } from "@/server/http";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invite = await revokeInvite(await currentUser(), id);
    return NextResponse.json({ ok: true, invite });
  } catch (error) {
    return errorResponse(error);
  }
}
