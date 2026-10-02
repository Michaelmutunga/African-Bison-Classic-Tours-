import { NextResponse } from "next/server";
import { z } from "zod";
import { incomePerBooking, incomePerMonth, incomePerServiceType, incomePerSupplier } from "@/server/reports";
import { errorResponse, requestActor } from "@/server/http";

const querySchema = z.object({
  groupBy: z.enum(["booking", "month", "supplier", "service-type"]).default("booking"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = querySchema.parse({
      groupBy: url.searchParams.get("groupBy") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    const actor = await requestActor();
    const filters = { from: query.from, to: query.to };
    const rows =
      query.groupBy === "month"
        ? await incomePerMonth(actor, filters)
        : query.groupBy === "supplier"
          ? await incomePerSupplier(actor, filters)
          : query.groupBy === "service-type"
            ? await incomePerServiceType(actor, filters)
            : await incomePerBooking(actor, filters);
    return NextResponse.json({ ok: true, groupBy: query.groupBy, rows });
  } catch (error) {
    return errorResponse(error);
  }
}
