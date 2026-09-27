import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

test.setTimeout(300_000);

async function register(email: string, name: string, password: string) {
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const response = await ctx.post("/api/account/register", {
    data: { name, email, password },
  });
  expect(response.status()).toBe(201);
  return ctx;
}

test("organiser creates a group, invites, traveller joins, completion tracks", async ({
  page,
  request,
}) => {
  const stamp = Date.now().toString(36);
  const email = `organiser-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: { customerName: "Group Organiser", customerEmail: email, adults: 4 },
  });
  expect(created.status()).toBe(201);
  const { reference } = (await created.json()) as { reference: string };

  const ctx = await register(email, "Group Organiser", "Organiser-Password-123!");

  const group = await ctx.post(`/api/account/bookings/${reference}/group`, {
    data: { name: "Mwangi family safari", expectedTravellers: 4 },
  });
  expect(group.status()).toBe(201);

  const invites = await ctx.post(`/api/account/bookings/${reference}/group/invites`, {
    data: { emails: [`guest-a-${stamp}@example.com`, `guest-b-${stamp}@example.com`] },
  });
  expect(invites.status()).toBe(201);
  const { invites: issued } = (await invites.json()) as {
    invites: { link: string }[];
  };
  expect(issued).toHaveLength(2);
  const token = issued[0]?.link.split("/invite/")[1];
  if (!token) throw new Error("invite link missing token");

  // Traveller opens the personal link: sees group context, nobody else.
  await page.goto(`/invite/${token}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Mwangi family safari")).toBeVisible();
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel(/Full name/).fill("Guest Alpha");
  await page.getByLabel("Nationality").fill("Kenyan");
  await page.getByLabel("Passport number").fill("A7654321");
  await page.getByLabel("Emergency contact").fill("Mum +254700000001");
  await page.getByLabel("Room preference").fill("Twin share with Guest Beta");
  await page.getByRole("button", { name: /Join the safari|Save changes/ }).click();
  await expect(page.getByRole("heading", { name: "You’re on the list — thank you." })).toBeVisible({
    timeout: 60_000,
  });

  // Organiser dashboard: 1 of 1 so far, room captured, passport counted.
  const dashboard = await ctx.get(`/api/account/bookings/${reference}/group`);
  expect(dashboard.status()).toBe(200);
  const body = (await dashboard.json()) as {
    summary: { total: number; completed: number; passports: number; roomsPending: number };
    travellers: { fullName: string; roomPreference: string | null }[];
    payment: { perPersonCents: number };
  };
  expect(body.summary).toMatchObject({ total: 1, completed: 1, passports: 1, roomsPending: 0 });
  expect(body.travellers[0]).toMatchObject({
    fullName: "Guest Alpha",
    roomPreference: "Twin share with Guest Beta",
  });
  expect(JSON.stringify(body)).not.toContain("A7654321");
  expect(body.payment.perPersonCents).toBeGreaterThanOrEqual(0);
  await ctx.dispose();
});

test("travellers cannot see each other through tokens", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const email = `org2-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: { customerName: "Org Two", customerEmail: email, adults: 2 },
  });
  const { reference } = (await created.json()) as { reference: string };
  const ctx = await register(email, "Org Two", "OrgTwo-Password-123!");
  await ctx.post(`/api/account/bookings/${reference}/group`, { data: { name: "Private Group" } });
  const invites = await ctx.post(`/api/account/bookings/${reference}/group/invites`, {
    data: { emails: [`solo-${stamp}@example.com`] },
  });
  const { invites: issued } = (await invites.json()) as { invites: { link: string }[] };
  const token = issued[0]?.link.split("/invite/")[1];
  if (!token) throw new Error("invite link missing token");

  // Unknown and revoked tokens 404.
  expect(await (await request.get("/api/invites/inv_doesnotexist")).status()).toBe(404);
  const context = await request.get(`/api/invites/${token}`);
  expect(context.status()).toBe(200);
  const body = (await context.json()) as { traveller: unknown; invite: { email: string } };
  expect(body.traveller).toBeNull();
  expect(body.invite.email).toBe(`solo-${stamp}@example.com`);
  // No list endpoint exists for travellers; the token context carries no others.
  expect(JSON.stringify(body)).not.toContain("Org Two");
  await ctx.dispose();
});

test("staff can invite and read the group dashboard", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const email = `staffgrp-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: { customerName: "Staff Group", customerEmail: email, adults: 2 },
  });
  const { reference } = (await created.json()) as { reference: string };
  const owner = await register(email, "Staff Group", "StaffGrp-Password-123!");
  await owner.post(`/api/account/bookings/${reference}/group`, { data: { name: "Staff Group" } });
  await owner.dispose();

  const staff = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await staff.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);
  const listed = (await (
    await staff.get("/api/admin/bookings")
  ).json()) as { bookings: { id: string; reference: string }[] };
  const booking = listed.bookings.find((b) => b.reference === reference);
  if (!booking) throw new Error("booking missing");

  const invited = await staff.post(`/api/admin/bookings/${booking.id}/group`, {
    data: { emails: [`vip-${stamp}@example.com`] },
  });
  expect(invited.status()).toBe(201);
  const dashboard = await staff.get(`/api/admin/bookings/${booking.id}/group`);
  expect(dashboard.status()).toBe(200);
  expect(((await dashboard.json()) as { invites: unknown[] }).invites).toHaveLength(1);
  await staff.dispose();
});
