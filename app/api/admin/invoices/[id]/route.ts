import { NextResponse } from "next/server";
import { z } from "zod";
import { setInvoiceStatus } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = z.object({ status: z.enum(["DRAFT", "SENT", "PAID", "VOID"]) }).parse(await readJson(request));
    const invoice = await setInvoiceStatus(await requestActor(), id, status);
    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    return errorResponse(error);
  }
}
