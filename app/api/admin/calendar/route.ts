import { NextResponse } from "next/server";
import { z } from "zod";
import { calendarEvents } from "@/server/operations";
import { marketplaceCalendar } from "@/server/suppliers";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { from, to } = z
      .object({ from: z.string().datetime(), to: z.string().datetime() })
      .parse({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    const actor = await requestActor();
    const [legacy, marketplace] = await Promise.all([
      calendarEvents(actor, new Date(from), new Date(to)),
      marketplaceCalendar(actor, new Date(from), new Date(to), {
        supplierId: url.searchParams.get("supplierId") ?? undefined,
        serviceType: url.searchParams.get("serviceType") ?? undefined,
        location: url.searchParams.get("location") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        lockStatus: url.searchParams.get("lockStatus") ?? undefined,
      }),
    ]);
    return NextResponse.json({ ok: true, ...legacy, marketplace });
  } catch (error) {
    return errorResponse(error);
  }
}
