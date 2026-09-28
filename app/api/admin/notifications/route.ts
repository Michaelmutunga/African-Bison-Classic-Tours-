import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { errorResponse } from "@/server/http";

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "bookings.write")) throw new ForbiddenError("bookings.write");
    const url = new URL(request.url);
    const event = url.searchParams.get("event") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const notifications = await prisma.notification.findMany({
      where: {
        ...(event ? { event } : {}),
        ...(status === "SENT" || status === "FAILED" || status === "QUEUED" ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    return errorResponse(error);
  }
}
