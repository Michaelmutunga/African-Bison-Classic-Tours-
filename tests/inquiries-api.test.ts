import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/inquiries/route";
import { prisma } from "@/lib/prisma";

function jsonRequest(payload: unknown): Request {
  return new Request("http://localhost/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/inquiries", () => {
  it("stores builder metadata with the inquiry", async () => {
    const email = `builder-${Date.now().toString(36)}@example.com`;
    const response = await POST(
      jsonRequest({
        name: "Builder Tester",
        email,
        message: "Safari plan from the builder, at least ten chars.",
        metadata: { source: "builder", draft: { regions: ["kenya"] } },
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { reference?: string };
    expect(body.reference).toMatch(/^INQ-/);
    const stored = await prisma.contactInquiry.findUniqueOrThrow({
      where: { reference: body.reference },
    });
    expect(stored.metadata).toMatchObject({ source: "builder" });
    await prisma.contactInquiry.delete({ where: { reference: body.reference } });
  });

  it("rejects invalid payloads with field details", async () => {
    const response = await POST(jsonRequest({ name: "x", email: "bad", message: "short" }));
    expect(response.status).toBe(422);
  });
});
