import { NextResponse } from "next/server";
import { z } from "zod";
import { setTaxFeeActive, upsertTaxFee } from "@/server/marketplace-pricing";
import { errorResponse, readJson, requestActor } from "@/server/http";

const activeSchema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await readJson(request)) as Record<string, unknown>;
    if (typeof body.active === "boolean" && Object.keys(body).length === 1) {
      const tax = await setTaxFeeActive(await requestActor(), id, activeSchema.parse(body).active);
      return NextResponse.json({ ok: true, tax });
    }
    const tax = await upsertTaxFee(await requestActor(), id, body);
    return NextResponse.json({ ok: true, tax });
  } catch (error) {
    return errorResponse(error);
  }
}
