import { NextResponse } from "next/server";
import { z } from "zod";
import { BASE_CURRENCY } from "@/lib/money";
import { DISPLAY_CURRENCY_COOKIE } from "@/lib/display-currency";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/server/http";

const displaySchema = z.object({
  displayCurrency: z.enum(["USD", "KES"]),
});

/**
 * Public-safe currency endpoint. GET exposes only USD/KES display rates
 * (no auth elevation: rates are not secret). POST persists the display-only
 * toggle in a cookie and never touches stored totals.
 */
export async function GET() {
  try {
    const rates = await prisma.currencyRate.findMany({
      where: { currency: { in: ["USD", "KES"] } },
      orderBy: { currency: "asc" },
    });
    return NextResponse.json({ ok: true, baseCurrency: BASE_CURRENCY, rates });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const data = displaySchema.parse(await readJson(request));
    const response = NextResponse.json({ ok: true, displayCurrency: data.displayCurrency });
    response.cookies.set(DISPLAY_CURRENCY_COOKIE, data.displayCurrency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
