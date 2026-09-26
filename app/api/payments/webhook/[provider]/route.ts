import { NextResponse } from "next/server";
import { applyWebhookEvent } from "@/server/payments";
import { getProvider } from "@/server/payments/providers";
import { errorResponse } from "@/server/http";

const SIGNATURE_HEADERS: Record<string, string> = {
  mock: "x-mock-signature",
  mpesa: "x-mpesa-signature",
  card: "x-card-signature",
};

/**
 * Provider callbacks. The provider SDK/webhook secret is authoritative —
 * the browser is never proof of payment.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider: providerName } = await params;
    const provider = getProvider(providerName);
    const rawBody = await request.text();
    const signature =
      request.headers.get(SIGNATURE_HEADERS[providerName] ?? "x-provider-signature");
    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json(
        { code: "invalid_signature", message: "Webhook signature verification failed." },
        { status: 401 },
      );
    }
    const event = provider.parseWebhookEvent(rawBody);
    const result = await applyWebhookEvent(provider.name, event);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
