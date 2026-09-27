import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/server/portal";
import { errorResponse, readJson } from "@/server/http";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

/** Staff reply inside a booking thread. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "bookings.write")) throw new ForbiddenError("bookings.write");
    const { id } = await params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ code: "not_found", message: "Booking not found." }, { status: 404 });
    }
    const data = messageSchema.parse(await readJson(request));
    const message = await prisma.customerMessage.create({
      data: { bookingId: id, authorId: user.id, authorRole: "staff", body: data.body },
    });
    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
