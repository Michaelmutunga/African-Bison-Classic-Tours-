import { NextResponse } from "next/server";
import { z } from "zod";
import { calendarEvents } from "@/server/operations";
import { errorResponse, requestActor } from "@/server/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { from, to } = z
      .object({ from: z.string().datetime(), to: z.string().datetime() })
      .parse({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    const result = await calendarEvents(await requestActor(), new Date(from), new Date(to));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
