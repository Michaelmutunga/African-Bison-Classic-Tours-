import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";
import { accommodationInput } from "@/server/catalogue";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) throw new UnauthorizedError();
    if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
    const { id } = await params;
    const data = accommodationInput.partial().parse(await readJson(request));
    const accommodation = await prisma.accommodation.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location ?? null } : {}),
        ...(data.category !== undefined ? { category: data.category ?? null } : {}),
        ...(data.boardBasis !== undefined ? { boardBasis: data.boardBasis ?? null } : {}),
        ...(data.supplier !== undefined ? { supplier: data.supplier ?? null } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
      include: { roomTypes: true },
    });
    return NextResponse.json({ ok: true, accommodation });
  } catch (error) {
    return errorResponse(error);
  }
}
