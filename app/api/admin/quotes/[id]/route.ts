import { NextResponse } from "next/server";
import { z } from "zod";
import type { QuoteStatus } from "@prisma/client";
import { getQuote, setQuoteStatus } from "@/server/pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

const statusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "EXPIRED", "CONVERTED"]),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quote = await getQuote(await requestActor(), id);
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = statusSchema.parse(await readJson(request));
    const quote = await setQuoteStatus(await requestActor(), id, status as QuoteStatus);
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    return errorResponse(error);
  }
}
