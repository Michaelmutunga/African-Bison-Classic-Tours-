import { NextResponse } from "next/server";
import { z } from "zod";
import { setSupplierLockStatus } from "@/server/suppliers";
import type { SupplierLockStatus } from "@prisma/client";
import { errorResponse, readJson, requestActor } from "@/server/http";

const bodySchema = z.object({
  status: z.enum(["REQUESTED", "HELD", "CONFIRMED", "DECLINED", "RELEASED", "COMPLETED"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJson(request));
    const lock = await setSupplierLockStatus(
      await requestActor(),
      id,
      body.status as SupplierLockStatus,
      body.reason,
    );
    return NextResponse.json({ ok: true, lock });
  } catch (error) {
    return errorResponse(error);
  }
}
