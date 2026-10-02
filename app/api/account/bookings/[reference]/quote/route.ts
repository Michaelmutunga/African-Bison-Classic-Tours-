import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptQuote, latestClientQuote, requestQuoteRevision } from "@/server/workflow";
import { currentUser } from "@/lib/auth";
import { errorResponse, readJson } from "@/server/http";

const actionSchema = z.object({
  action: z.enum(["accept", "revise"]),
  comments: z.string().trim().max(4000).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const quote = await latestClientQuote(await currentUser(), reference);
    return NextResponse.json({ ok: true, ...quote });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const { action, comments } = actionSchema.parse(await readJson(request));
    if (action === "accept") {
      const booking = await acceptQuote(await currentUser(), reference);
      return NextResponse.json({ ok: true, status: booking.status });
    }
    await requestQuoteRevision(await currentUser(), reference, { comments: comments ?? "" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
