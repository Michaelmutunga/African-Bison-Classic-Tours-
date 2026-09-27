import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { code: "unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }
    const data = passwordSchema.parse(await readJson(request));
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record || !(await verifyPassword(data.currentPassword, record.passwordHash))) {
      return NextResponse.json(
        { code: "invalid_credentials", message: "Current password is incorrect." },
        { status: 401 },
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(data.newPassword) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
