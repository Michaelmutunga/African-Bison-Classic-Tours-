import { NextResponse } from "next/server";
import { z } from "zod";
import { reconcilePayment, retryPayment } from "@/server/payments";
import { errorResponse, readJson, requestActor } from "@/server/http";

const bodySchema = z.object({
  email: z.string().trim().email().max(254).optional(),
  mode: z.enum(["retry", "reconcile"]).default("retry"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJson(request).catch(() => ({})));
    const actor = await requestActor();
    const payment =
      body.mode === "reconcile"
        ? await reconcilePayment(actor, id, body.email)
        : await retryPayment(actor, id, body.email);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    return errorResponse(error);
  }
}
