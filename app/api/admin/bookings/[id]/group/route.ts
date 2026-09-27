import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { groupDashboard, staffGroupInvite } from "@/server/groups";
import { errorResponse, readJson } from "@/server/http";
import { z } from "zod";

async function gateStaff() {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "bookings.write")) throw new ForbiddenError("bookings.write");
  return user;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await gateStaff();
    const { id } = await params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ code: "not_found", message: "Booking not found." }, { status: 404 });
    }
    const dashboard = await groupDashboard(user, booking.reference);
    return NextResponse.json({ ok: true, ...dashboard });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await gateStaff();
    const { id } = await params;
    const { emails } = z.object({ emails: z.array(z.string().email()).min(1).max(30) }).parse(await readJson(request));
    const invites = await staffGroupInvite({ id: user.id, role: user.role }, id, emails);
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
