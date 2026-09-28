import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { clientIp, throttled } from "@/lib/ratelimit";
import { errorResponse } from "@/server/http";
import { conciergeRequestSchema, handleMessage } from "@/server/concierge/engine";

/**
 * POST /api/concierge — controlled safari assistant. Anonymous callers get
 * the public scope (catalogue, FAQs, contact); signed-in customers
 * additionally get their OWN bookings. No other data is reachable.
 */
export async function POST(request: Request) {
  try {
    if (throttled(`concierge:${clientIp(request)}`, 30, 60_000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Slow down a little — try again in a minute." },
        { status: 429 },
      );
    }
    const user = await currentUser();
    const payload = conciergeRequestSchema.parse(await request.json().catch(() => undefined));
    const result = await handleMessage(user, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
