import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { BASE_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const rateSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  // Units of currency per 1 base unit (e.g. 129 KES = 1 USD).
  rateToBase: z.number().positive().max(1_000_000),
});

async function gateWrite(): Promise<void> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
}

export async function GET() {
  try {
    await gateWrite();
    const rates = await prisma.currencyRate.findMany({ orderBy: { currency: "asc" } });
    return NextResponse.json({ ok: true, baseCurrency: BASE_CURRENCY, rates });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await gateWrite();
    const data = rateSchema.parse(await readJson(request));
    const rate = await prisma.currencyRate.upsert({
      where: { currency: data.currency },
      update: { rateToBase: data.rateToBase, asOf: new Date() },
      create: { currency: data.currency, rateToBase: data.rateToBase },
    });
    return NextResponse.json({ ok: true, rate });
  } catch (error) {
    return errorResponse(error);
  }
}
