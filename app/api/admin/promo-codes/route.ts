import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const promoSchema = z.object({
  code: z.string().trim().min(3).max(40),
  kind: z.string().trim().min(2).max(20).default("discount"),
  amountCents: z.number().int().min(0).nullable().optional(),
  percentBps: z.number().int().min(1).max(10_000).nullable().optional(),
  currency: z.string().trim().length(3).default("USD"),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  active: z.boolean().default(true),
});

async function gateWrite(): Promise<void> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
}

export async function GET() {
  try {
    await gateWrite();
    const promoCodes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, promoCodes });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await gateWrite();
    const data = promoSchema.parse(await readJson(request));
    const promoCode = await prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        kind: data.kind,
        amountCents: data.amountCents ?? null,
        percentBps: data.percentBps ?? null,
        currency: data.currency,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        maxUses: data.maxUses ?? null,
        active: data.active,
      },
    });
    return NextResponse.json({ ok: true, promoCode }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
