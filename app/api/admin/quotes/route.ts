import { NextResponse } from "next/server";
import type { QuoteStatus } from "@prisma/client";
import { createQuote, expireQuotes, listQuotes } from "@/server/pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as QuoteStatus | null;
    // Opportunistic expiry so lists never show stale actionable quotes.
    await expireQuotes().catch(() => undefined);
    const quotes = await listQuotes(await requestActor(), status ?? undefined);
    return NextResponse.json({ ok: true, quotes });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const quote = await createQuote(await requestActor(), await readJson(request));
    return NextResponse.json({ ok: true, quote }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
