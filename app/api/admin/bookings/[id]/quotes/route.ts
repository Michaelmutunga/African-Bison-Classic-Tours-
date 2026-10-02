import { NextResponse } from "next/server";
import { z } from "zod";
import { approveQuote, saveQuoteVersion, sendQuote } from "@/server/workflow";
import { errorResponse, readJson, requestActor } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, hasPermission } from "@/lib/permissions";

async function gate() {
  const actor = await requestActor();
  if (!actor || !hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
  return actor;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await gate();
    const versions = await prisma.quoteVersion.findMany({
      where: { bookingId: id },
      orderBy: { version: "desc" },
    });
    return NextResponse.json({ ok: true, versions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { version, diff } = await saveQuoteVersion(await gate(), id, await readJson(request));
    return NextResponse.json({ ok: true, version, diff }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

const actionSchema = z.object({ action: z.enum(["approve", "send"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action } = actionSchema.parse(await readJson(request));
    const version =
      action === "approve" ? await approveQuote(await gate(), id) : await sendQuote(await gate(), id);
    return NextResponse.json({ ok: true, version });
  } catch (error) {
    return errorResponse(error);
  }
}
