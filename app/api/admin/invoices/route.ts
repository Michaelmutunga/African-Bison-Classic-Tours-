import { NextResponse } from "next/server";
import { z } from "zod";
import { generateInvoice, listInvoices } from "@/server/operations";
import { errorResponse, readJson, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const invoices = await listInvoices(await requestActor(), status);
    return NextResponse.json({ ok: true, invoices });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { bookingId } = z.object({ bookingId: z.string().cuid() }).parse(await readJson(request));
    const invoice = await generateInvoice(await requestActor(), bookingId);
    return NextResponse.json({ ok: true, invoice }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
