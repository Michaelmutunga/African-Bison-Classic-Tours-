import { NextResponse } from "next/server";
import { clientIp, throttled } from "@/lib/ratelimit";
import { createPayment } from "@/server/payments";
import { errorResponse, readJson, requestActor } from "@/server/http";

/** Start a payment. Guests prove ownership with the booking email. */
export async function POST(request: Request) {
  try {
    if (throttled(`payments:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json(
        { code: "rate_limited", message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    }
    const payment = await createPayment(await requestActor(), await readJson(request));
    return NextResponse.json(
      {
        ok: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amountCents: payment.amountCents,
          currency: payment.currency,
          providerRef: payment.providerRef,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
