/**
 * Notification provider boundaries (Phase 12). Business code calls the
 * dispatcher, never a vendor. Each channel fails closed when unconfigured.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  configured(): boolean;
  send(message: EmailMessage): Promise<{ providerRef: string }>;
}

export class ProviderError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

/** Development fallback: logs instead of sending. Never used in production. */
class LogEmailProvider implements EmailProvider {
  readonly name = "log";
  configured(): boolean {
    return process.env.NODE_ENV !== "production";
  }
  async send(message: EmailMessage): Promise<{ providerRef: string }> {
    console.log(`[email:${message.to}] ${message.subject}`);
    return { providerRef: `log_${Date.now().toString(36)}` };
  }
}

/** Resend adapter. Active only with RESEND_API_KEY + RESEND_FROM. */
class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  configured(): boolean {
    return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM;
  }
  async send(message: EmailMessage): Promise<{ providerRef: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!apiKey || !from) {
      throw new ProviderError("Resend is not configured (RESEND_API_KEY / RESEND_FROM)");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
    });
    if (!response.ok) {
      throw new ProviderError(`Resend rejected the message (${response.status})`);
    }
    const body = (await response.json()) as { id?: string };
    return { providerRef: body.id ?? `resend_${Date.now().toString(36)}` };
  }
}

export function getEmailProvider(): EmailProvider {
  const resend = new ResendEmailProvider();
  if (resend.configured()) return resend;
  const log = new LogEmailProvider();
  if (log.configured()) return log;
  throw new ProviderError("No email provider is configured");
}

// ---------------------------------------------------------------------------
// WhatsApp + SMS: integration boundaries. Sending stays disabled until the
// business connects WhatsApp Business / an SMS aggregator (tracked).
// ---------------------------------------------------------------------------

export interface ChatMessage {
  to: string;
  body: string;
}

export interface ChatProvider {
  readonly name: "whatsapp" | "sms";
  configured(): boolean;
  send(message: ChatMessage): Promise<{ providerRef: string }>;
}

class DisabledChatProvider implements ChatProvider {
  constructor(readonly name: "whatsapp" | "sms") {}
  configured(): boolean {
    return false;
  }
  async send(): Promise<{ providerRef: string }> {
    throw new ProviderError(
      `${this.name} is not connected. Messages queue as FAILED with a clear reason until credentials exist.`,
    );
  }
}

/**
 * Optional generic WhatsApp webhook hook (marketplace Phase 4). When
 * WHATSAPP_HOOK_URL is set, WhatsApp notifications POST as JSON instead of
 * failing closed — no vendor SDK, works with n8n/Zapier/Meta bridges.
 * Optional WHATSAPP_HOOK_SECRET signs the body (HMAC-SHA256 hex).
 */
class WebhookChatProvider implements ChatProvider {
  readonly name = "whatsapp" as const;
  configured(): boolean {
    return !!process.env.WHATSAPP_HOOK_URL;
  }
  async send(message: ChatMessage): Promise<{ providerRef: string }> {
    const url = process.env.WHATSAPP_HOOK_URL;
    if (!url) throw new ProviderError("WHATSAPP_HOOK_URL is not configured");
    const body = JSON.stringify({ to: message.to, body: message.body, at: new Date().toISOString() });
    const secret = process.env.WHATSAPP_HOOK_SECRET;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) {
      const { createHmac } = await import("node:crypto");
      headers["X-Webhook-Signature"] = createHmac("sha256", secret).update(body).digest("hex");
    }
    const response = await fetch(url, { method: "POST", headers, body });
    if (!response.ok) throw new ProviderError(`WhatsApp hook rejected the message (${response.status})`);
    return { providerRef: `hook_${Date.now().toString(36)}` };
  }
}

export function getWhatsAppProvider(): ChatProvider {
  const hook = new WebhookChatProvider();
  if (hook.configured()) return hook;
  return new DisabledChatProvider("whatsapp");
}

export function getSmsProvider(): ChatProvider {
  return new DisabledChatProvider("sms");
}
