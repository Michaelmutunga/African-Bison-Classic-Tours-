import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const seasonPatch = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  startsOn: z.string().trim().max(10).nullable().optional(),
  endsOn: z.string().trim().max(10).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  multiplierBps: z.number().int().min(0).max(100_000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    const { id } = await params;
    const data = seasonPatch.parse(await readJson(request));
    const season = await prisma.season.update({ where: { id }, data });
    return NextResponse.json({ ok: true, season });
  } catch (error) {
    return errorResponse(error);
  }
}
