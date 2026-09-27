import { NextResponse } from "next/server";
import { acceptInvite, getInviteContext } from "@/server/groups";
import { errorResponse, readJson } from "@/server/http";
import { currentUser } from "@/lib/auth";

/** Token-gated self-service: context reveals only this invite. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const context = await getInviteContext(token);
    return NextResponse.json({ ok: true, ...context });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const user = await currentUser().catch(() => null);
    const traveller = await acceptInvite(token, await readJson(request), user?.id);
    return NextResponse.json({ ok: true, traveller });
  } catch (error) {
    return errorResponse(error);
  }
}
