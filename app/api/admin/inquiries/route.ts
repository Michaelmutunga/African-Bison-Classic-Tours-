import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { errorResponse } from "@/server/http";

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "inquiries.read")) throw new ForbiddenError("inquiries.read");
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const inquiries = await prisma.contactInquiry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ok: true, inquiries });
  } catch (error) {
    return errorResponse(error);
  }
}
