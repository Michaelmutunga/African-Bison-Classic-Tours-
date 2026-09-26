import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Payment provider abstraction (Phase 7). Business logic never touches a
 * vendor SDK — everything goes through this interface, so M-Pesa, cards or
 * future providers slot in without touching bookings or quotes.
 */

export type ProviderName = "mock" | "mpesa" | "card";

export type ProviderEventType = "succeeded" | "failed";

export interface ProviderEvent {
  type: ProviderEventType;
  providerRef: string;
  amountCents?: number;
}

export interface CreatePaymentArgs {
  amountCents: number;
  currency: string;
  reference: string;
  customerEmail: string;
  metadata?: Record<string, unknown>;
}

export interface CreatedPayment {
  providerRef: string;
  instructions?: string;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  /** True only when credentials for this provider are configured. */
  configured(): boolean;
  createPayment(args: CreatePaymentArgs): Promise<CreatedPayment>;
  getTransactionStatus(providerRef: string): Promise<ProviderEventType | "pending" | "unknown">;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  parseWebhookEvent(rawBody: string): ProviderEvent;
  refundPayment(providerRef: string, amountCents?: number): Promise<{ providerRef: string }>;
}

export class ProviderError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(message = "Provider request timed out") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Mock provider: deterministic test double with programmable behavior.
// ---------------------------------------------------------------------------

type MockBehavior = "succeed" | "fail" | "hang";

interface MockLedgerEntry {
  status: ProviderEventType | "pending";
  amountCents: number;
  currency: string;
}

function mockSecret(): string {
  const secret = process.env.MOCK_PROVIDER_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new ProviderError("MOCK_PROVIDER_SECRET is required in production");
  }
  return secret ?? "dev-mock-secret";
}

export class MockProvider implements PaymentProvider {
  readonly name: ProviderName = "mock";
  private ledger = new Map<string, MockLedgerEntry>();
  private behaviors = new Map<string, MockBehavior>();
  calls = { create: 0, refund: 0 };

  configured(): boolean {
    return true;
  }

  /** Test hook: force the next createPayment with this key to behave so. */
  setBehavior(key: string, behavior: MockBehavior): void {
    this.behaviors.set(key, behavior);
  }

  reset(): void {
    this.ledger.clear();
    this.behaviors.clear();
    this.calls = { create: 0, refund: 0 };
  }

  async createPayment(args: CreatePaymentArgs): Promise<CreatedPayment> {
    this.calls.create += 1;
    const behavior = this.behaviors.get(args.reference) ?? "succeed";
    if (behavior === "hang") {
      throw new ProviderTimeoutError(`Mock provider hung on ${args.reference}`);
    }
    const providerRef = `mock_${randomBytes(8).toString("hex")}`;
    this.ledger.set(providerRef, {
      status: "pending",
      amountCents: args.amountCents,
      currency: args.currency,
    });
    return {
      providerRef,
      instructions: "Mock payment — confirm via the test webhook callback.",
    };
  }

  async getTransactionStatus(providerRef: string): Promise<ProviderEventType | "pending" | "unknown"> {
    return this.ledger.get(providerRef)?.status ?? "unknown";
  }

  /** Test hook: settle a pending mock transaction, returning a signed body. */
  settle(providerRef: string, type: ProviderEventType): string {
    const entry = this.ledger.get(providerRef);
    if (!entry) throw new ProviderError(`Unknown mock transaction ${providerRef}`);
    entry.status = type;
    const body = JSON.stringify({ providerRef, type, amountCents: entry.amountCents });
    const signature = createHmac("sha256", mockSecret()).update(body).digest("hex");
    return JSON.stringify({ body, signature });
  }

  signEvent(providerRef: string, type: ProviderEventType, amountCents: number): { body: string; signature: string } {
    const body = JSON.stringify({ providerRef, type, amountCents });
    return { body, signature: createHmac("sha256", mockSecret()).update(body).digest("hex") };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const expected = createHmac("sha256", mockSecret()).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: string): ProviderEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new ProviderError("Malformed webhook payload");
    }
    const event = parsed as Partial<ProviderEvent>;
    if ((event.type !== "succeeded" && event.type !== "failed") || typeof event.providerRef !== "string") {
      throw new ProviderError("Malformed webhook payload");
    }
    return { type: event.type, providerRef: event.providerRef, amountCents: event.amountCents };
  }

  async refundPayment(providerRef: string): Promise<{ providerRef: string }> {
    this.calls.refund += 1;
    if (!this.ledger.has(providerRef)) throw new ProviderError(`Unknown mock transaction ${providerRef}`);
    return { providerRef: `mock_refund_${randomBytes(8).toString("hex")}` };
  }
}

export const mockProvider = new MockProvider();

// ---------------------------------------------------------------------------
// Production adapters: fail closed without credentials. Full Daraja / card
// processor wiring lands when the business supplies live keys (tracked for
// the payments hardening pass). The shapes below are the integration seam.
// ---------------------------------------------------------------------------

abstract class CredentialedProvider implements PaymentProvider {
  abstract readonly name: ProviderName;
  protected abstract requiredEnv(): string[];

  configured(): boolean {
    return this.requiredEnv().every((key) => !!process.env[key]);
  }

  protected assertConfigured(): void {
    const missing = this.requiredEnv().filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new ProviderError(
        `${this.name} is not configured (missing ${missing.join(", ")}). ` +
          "Production payments stay disabled until credentials are supplied.",
      );
    }
  }

  abstract createPayment(args: CreatePaymentArgs): Promise<CreatedPayment>;
  abstract getTransactionStatus(providerRef: string): Promise<ProviderEventType | "pending" | "unknown">;
  abstract verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  abstract parseWebhookEvent(rawBody: string): ProviderEvent;
  abstract refundPayment(providerRef: string, amountCents?: number): Promise<{ providerRef: string }>;
}

export class MpesaProvider extends CredentialedProvider {
  readonly name: ProviderName = "mpesa";

  protected requiredEnv(): string[] {
    return ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY"];
  }

  async createPayment(): Promise<CreatedPayment> {
    this.assertConfigured();
    // Daraja STK-push wiring goes here once credentials exist.
    throw new ProviderError("M-Pesa STK push is not yet wired to live credentials");
  }

  async getTransactionStatus(): Promise<ProviderEventType | "pending" | "unknown"> {
    this.assertConfigured();
    throw new ProviderError("M-Pesa status query is not yet wired");
  }

  verifyWebhookSignature(): boolean {
    this.assertConfigured();
    return false;
  }

  parseWebhookEvent(): ProviderEvent {
    throw new ProviderError("M-Pesa callbacks are not yet wired");
  }

  async refundPayment(): Promise<{ providerRef: string }> {
    this.assertConfigured();
    throw new ProviderError("M-Pesa refunds are not yet wired");
  }
}

export class CardProvider extends CredentialedProvider {
  readonly name: ProviderName = "card";

  protected requiredEnv(): string[] {
    return ["CARD_PROCESSOR_KEY", "CARD_PROCESSOR_SECRET"];
  }

  async createPayment(): Promise<CreatedPayment> {
    this.assertConfigured();
    throw new ProviderError("Card processing is not yet wired to live credentials");
  }

  async getTransactionStatus(): Promise<ProviderEventType | "pending" | "unknown"> {
    this.assertConfigured();
    throw new ProviderError("Card status query is not yet wired");
  }

  verifyWebhookSignature(): boolean {
    this.assertConfigured();
    return false;
  }

  parseWebhookEvent(): ProviderEvent {
    throw new ProviderError("Card webhooks are not yet wired");
  }

  async refundPayment(): Promise<{ providerRef: string }> {
    this.assertConfigured();
    throw new ProviderError("Card refunds are not yet wired");
  }
}

const registry: Record<ProviderName, PaymentProvider> = {
  mock: mockProvider,
  mpesa: new MpesaProvider(),
  card: new CardProvider(),
};

export function getProvider(name: string): PaymentProvider {
  const provider = (registry as Record<string, PaymentProvider | undefined>)[name];
  if (!provider) throw new ProviderError(`Unknown payment provider: ${name}`);
  if (!provider.configured()) {
    throw new ProviderError(
      `Payment provider "${name}" is not configured. Production payments stay disabled until credentials are supplied.`,
    );
  }
  return provider;
}
