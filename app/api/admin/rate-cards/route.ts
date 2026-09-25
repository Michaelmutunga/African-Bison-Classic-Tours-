import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/server/catalogue";
import { errorResponse, readJson } from "@/server/http";

const rateCardSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  comfortTier: z.string().trim().min(1).max(40),
  transportStyle: z.string().trim().max(40).nullable().optional(),
  amountCents: z.number().int().min(0),
  currency: z.string().trim().length(3).default("USD"),
  placeholder: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});

async function gateWrite(): Promise<void> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
}

export async function GET() {
  try {
    await gateWrite();
    const rateCards = await prisma.rateCard.findMany({ orderBy: { comfortTier: "asc" } });
    return NextResponse.json({ ok: true, rateCards });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await gateWrite();
    const data = rateCardSchema.parse(await readJson(request));
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);
    // No upsert: Postgres treats NULLs as distinct in unique constraints, so
    // (comfortTier, NULL) would not conflict. findFirst translates null to
    // IS NULL correctly; admin writes are low-contention by nature.
    const where = { comfortTier: data.comfortTier, transportStyle: data.transportStyle ?? null };
    const existing = await prisma.rateCard.findFirst({ where });
    const rateCard = existing
      ? await prisma.rateCard.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            slug,
            amountCents: data.amountCents,
            currency: data.currency,
            placeholder: data.placeholder,
            notes: data.notes ?? null,
          },
        })
      : await prisma.rateCard.create({
          data: {
            name: data.name,
            slug,
            comfortTier: data.comfortTier,
            transportStyle: data.transportStyle ?? null,
            amountCents: data.amountCents,
            currency: data.currency,
            placeholder: data.placeholder,
            notes: data.notes ?? null,
          },
        });
    return NextResponse.json({ ok: true, rateCard }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
