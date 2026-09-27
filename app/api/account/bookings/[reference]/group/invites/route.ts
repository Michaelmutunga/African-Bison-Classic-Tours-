import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { inviteTravellers } from "@/server/groups";
import { errorResponse, readJson } from "@/server/http";

/** Owner invites travellers. Email delivery lands with notifications
 * (Phase 12); until then the response carries shareable links. */
export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const invites = await inviteTravellers(await currentUser(), reference, await readJson(request));
    return NextResponse.json(
      {
        ok: true,
        invites: invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          status: invite.status,
          link: `/invite/${invite.token}`,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
