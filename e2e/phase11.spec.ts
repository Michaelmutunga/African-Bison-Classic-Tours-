import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

test.setTimeout(300_000);

async function staffContext() {
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);
  return ctx;
}

test("draft posts stay private until published, then unpublish hides them", async ({
  page,
  request,
}) => {
  const ctx = await staffContext();
  const stamp = Date.now().toString(36);
  const slug = `e2e-post-${stamp}`;
  const created = await ctx.post("/api/admin/posts", {
    data: {
      title: `E2E Post ${stamp} About Testing`,
      slug,
      excerpt: "An excerpt with enough words to pass validation in this test.",
      paragraphs: ["A body paragraph with enough words to be valid content here."],
    },
  });
  expect(created.status()).toBe(201);

  // Draft: invisible to the public.
  expect(await (await request.get(`/blog/${slug}`)).status()).toBe(404);

  const published = await ctx.patch(`/api/admin/posts/${((await created.json()) as { post: { id: string } }).post.id}`, {
    data: { status: "PUBLISHED" },
  });
  expect(published.status()).toBe(200);
  await page.goto(`/blog/${slug}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("A body paragraph with enough words")).toBeVisible();

  const hidden = await ctx.patch(`/api/admin/posts/${((await created.json()) as { post: { id: string } }).post.id}`, {
    data: { status: "ARCHIVED" },
  });
  expect(hidden.status()).toBe(200);
  expect(await (await request.get(`/blog/${slug}`)).status()).toBe(404);
  await ctx.dispose();
});

test("admin content console lists journal, faqs, media and settings", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 60_000 });

  await page.goto("/admin/blog", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Journal/ })).toBeVisible({ timeout: 60_000 });
  await page.goto("/admin/faqs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /FAQs/ })).toBeVisible({ timeout: 60_000 });
  await page.goto("/admin/media", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Media registry/ })).toBeVisible({ timeout: 60_000 });
  await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("business.name")).toBeVisible({ timeout: 60_000 });
});

test("public faq and seo metadata render from the CMS", async ({ page, request }) => {
  await page.goto("/faq", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Questions, answered honestly" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Where is African Bison Classic Tours based?")).toBeVisible();

  const response = await request.get("/blog/maasai-cultural-village-visit-6-ethical-tips");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("application/ld+json");
  expect(html).toMatch(/<title>[^<]+<\/title>/);
});
