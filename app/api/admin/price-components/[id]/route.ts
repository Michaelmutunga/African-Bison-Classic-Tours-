import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const componentPatch = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  amountCents: z.number().int().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  perPerson: z.boolean().optional(),
  placeholder: z.boolean().optional(),
  destinationId: z.string().cuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    const { id } = await params;
    const data = componentPatch.parse(await readJson(request));
    const priceComponent = await prisma.priceComponent.update({ where: { id }, data });
    return NextResponse.json({ ok: true, priceComponent });
  } catch (error) {
    return errorResponse(error);
  }
}
