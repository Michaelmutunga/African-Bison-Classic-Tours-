import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as webhook } from "@/app/api/payments/webhook/[provider]/route";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { throttled } from "@/lib/ratelimit";
import {
  contentSecurityPolicy,
  devContentSecurityPolicy,
  devSecurityHeaders,
  securityHeaders,
} from "@/lib/security-headers";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { errorResponse } from "@/server/http";
import { templates } from "@/server/notifications/templates";
import { createTestUser, unique } from "@/tests/db";

function jsonRequest(url: string, payload: unknown, headers?: Record<string, string>): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

describe("security headers", () => {
  it("sends a locked-down header set on every route", () => {
    const keys = securityHeaders.map((h) => h.key);
    for (const required of [
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ]) {
      expect(keys, required).toContain(required);
    }
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    // No third-party script, tracker or embed is allowlisted.
    expect(contentSecurityPolicy).not.toContain("https://");
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps eval out of the shipped policy (dev only)", () => {
    // Production CSP: strict. Dev CSP: identical except webpack's eval.
    expect(contentSecurityPolicy).not.toContain("unsafe-eval");
    expect(devContentSecurityPolicy).toContain("unsafe-eval");
    expect(devSecurityHeaders.map((h) => h.key)).toEqual(securityHeaders.map((h) => h.key));
  });
});

describe("rate limiting", () => {
  it("allows up to the limit, then blocks inside the window", () => {
    const key = unique("throttle");
    expect(throttled(key, 3, 60_000)).toBe(false);
    expect(throttled(key, 3, 60_000)).toBe(false);
    expect(throttled(key, 3, 60_000)).toBe(false);
    expect(throttled(key, 3, 60_000)).toBe(true);
    expect(throttled(key, 3, 60_000)).toBe(true);
  });

  it("resets after the window lapses", async () => {
    const key = unique("window");
    expect(throttled(key, 1, 20)).toBe(false);
    expect(throttled(key, 1, 20)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(throttled(key, 1, 20)).toBe(false);
  });
});

describe("authentication attacks", () => {
  it("rejects SQL-injection-style emails at validation, before the database", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "' OR '1'='1",
        password: "anything",
      }),
    );
    expect(response.status).toBe(422);
  });

  it("returns the identical generic response for unknown users", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: `${unique("nobody")}@example.com`,
        password: "Wrong-Password-123!",
      }),
    );
    expect(response.status).toBe(401);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe("invalid_credentials");
    expect(body.message).not.toContain("not found");
  });

  it("issues fresh random session tokens (no fixation)", async () => {
    const email = `${unique("fixation")}@example.com`;
    const user = await createTestUser(email, "CUSTOMER");
    const first = await createSession(user.id);
    const second = await createSession(user.id);
    expect(first.token).not.toBe(second.token);
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe("malformed payment webhooks", () => {
  const routeArgs = { params: Promise.resolve({ provider: "mock" }) };

  it("rejects missing signatures without touching money", async () => {
    const paymentsBefore = await prisma.payment.count();
    const response = await webhook(
      new Request("http://localhost/api/payments/webhook/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerRef: "mock_nope", type: "succeeded" }),
      }),
      routeArgs,
    );
    expect(response.status).toBe(401);
    expect(await prisma.payment.count()).toBe(paymentsBefore);
  });

  it("rejects forged signatures and non-JSON bodies", async () => {
    const forged = await webhook(
      jsonRequest(
        "http://localhost/api/payments/webhook/mock",
        { providerRef: "mock_nope", type: "succeeded" },
        { "x-mock-signature": "forged" },
      ),
      routeArgs,
    );
    expect(forged.status).toBe(401);

    const binary = await webhook(
      new Request("http://localhost/api/payments/webhook/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mock-signature": "forged" },
        body: "this is not json{{{",
      }),
      routeArgs,
    );
    expect(binary.status).toBe(401);
  });
});

describe("output safety", () => {
  it("escapes XSS-style input in every email template", () => {
    const evil = '"><script>alert(1)</script>';
    for (const [name, render] of Object.entries(templates)) {
      const out = render({ name: evil, reference: evil, title: evil, amount: evil, details: [evil] });
      expect(out.html, name).not.toContain("<script>");
      expect(out.html, name).toContain("&lt;script&gt;");
    }
  });

  it("maps auth failures to status codes without leaking internals", async () => {
    const unauth = await errorResponse(new UnauthorizedError()).json();
    expect(unauth.code).toBe("unauthorized");

    const forbidden = await errorResponse(new ForbiddenError("bookings.write")).json();
    expect(forbidden.code).toBe("forbidden");

    const boom = (await errorResponse(new Error("prisma exploded: secret")).json()) as {
      code: string;
      message: string;
    };
    expect(boom.code).toBe("internal_error");
    expect(`${boom.code} ${boom.message}`).not.toContain("secret");
  });
});
