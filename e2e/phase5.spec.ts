import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

test("anonymous quote creation is rejected with 401", async ({ request }) => {
  const response = await request.post("/api/admin/quotes", { data: {} });
  expect(response.status()).toBe(401);
});

test("admin quote lifecycle over HTTP", async () => {
  test.setTimeout(240_000);
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);

  const categories = (await (await ctx.get("/api/admin/categories")).json()) as {
    categories: { id: string; slug: string }[];
  };
  const kenya = categories.categories.find((c) => c.slug === "kenya") ?? categories.categories[0];
  if (!kenya) throw new Error("No categories seeded");

  const created = await ctx.post("/api/admin/quotes", {
    data: {
      startDate: "2027-08-10",
      endDate: "2027-08-16",
      adults: 2,
      children: 1,
      comfortTier: "mid-range",
      transportStyle: "land-cruiser",
      currency: "USD",
      customerName: "Phase Five",
      customerEmail: "phase5-e2e@example.com",
      promoCode: "EARLYBIRD",
    },
  });
  expect(created.status()).toBe(201);
  const quote = (await created.json()).quote as {
    id: string;
    number: string;
    status: string;
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    depositCents: number;
    hasPlaceholderRates: boolean;
    items: { kind: string; totalCents: number }[];
  };
  expect(quote.number).toMatch(/^Q-\d{4}-/);
  expect(quote.status).toBe("DRAFT");
  // Seeded illustrative rates are placeholders — the quote must say so.
  expect(quote.hasPlaceholderRates).toBe(true);
  expect(quote.discountCents).toBeGreaterThan(0); // EARLYBIRD 10%
  expect(quote.totalCents).toBe(quote.subtotalCents - quote.discountCents);
  expect(quote.depositCents).toBe(Math.round(quote.totalCents * 0.3));
  const kinds = quote.items.map((i) => i.kind);
  expect(kinds).toContain("base");
  expect(kinds).toContain("base_child");
  expect(kinds).toContain("season");

  const fetched = await ctx.get(`/api/admin/quotes/${quote.id}`);
  expect(fetched.status()).toBe(200);

  // Invalid transition is rejected.
  const bad = await ctx.patch(`/api/admin/quotes/${quote.id}`, {
    data: { status: "ACCEPTED" },
  });
  expect(bad.status()).toBe(422);

  for (const status of ["SENT", "ACCEPTED", "CONVERTED"]) {
    const moved = await ctx.patch(`/api/admin/quotes/${quote.id}`, { data: { status } });
    expect(moved.status(), status).toBe(200);
  }

  // Expired promo is rejected, not silently ignored.
  const expired = await ctx.post("/api/admin/quotes", {
    data: {
      startDate: "2027-08-10",
      endDate: "2027-08-16",
      adults: 1,
      comfortTier: "value",
      promoCode: "NO-SUCH-CODE",
    },
  });
  expect(expired.status()).toBe(422);
  await ctx.dispose();
});
