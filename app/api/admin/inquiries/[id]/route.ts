import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { recordAudit } from "@/server/operations";
import { errorResponse, readJson } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "inquiries.read")) throw new ForbiddenError("inquiries.read");
    const { id } = await params;
    const { status } = z.object({ status: z.string().trim().min(2).max(40) }).parse(await readJson(request));
    const inquiry = await prisma.contactInquiry.update({ where: { id }, data: { status } });
    await recordAudit(user.id, "inquiry.status", "inquiry", id);
    return NextResponse.json({ ok: true, inquiry });
  } catch (error) {
    return errorResponse(error);
  }
}
