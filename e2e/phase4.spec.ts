import { expect, type Page, test } from "@playwright/test";

test.setTimeout(300_000);

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function dayCell(date: Date): RegExp {
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return new RegExp(`${day} ${month} ${date.getFullYear()}`);
}

async function pickDate(page: Page, calendarHeading: string, target: Date) {
  const section = page.locator("div", { has: page.getByRole("heading", { name: calendarHeading }) }).last();
  for (let i = 0; i < 16; i++) {
    if (await section.getByText(monthLabel(target), { exact: true }).count()) break;
    await section.getByRole("button", { name: "Next month" }).click();
  }
  await section.getByText(monthLabel(target), { exact: true }).waitFor({ timeout: 10_000 });
  await section.getByRole("gridcell", { name: dayCell(target) }).click();
}

async function futureTrip(): Promise<{ start: Date; end: Date }> {
  const start = new Date();
  start.setDate(start.getDate() + 60);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

test("builder gates empty choices and walks the full flow to a planner request", async ({
  page,
}) => {
  await page.goto("/builder", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Build it your way, step by step" })).toBeVisible({
    timeout: 60_000,
  });

  // Step 1 gates: nothing selected → Continue disabled.
  await expect(page.getByRole("button", { name: "Continue →" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Kenya", exact: true }).click();
  await page.getByRole("checkbox", { name: "Tanzania", exact: true }).click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 2: experiences (optional).
  await expect(page.getByRole("heading", { name: "What kind of experience?" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Great Migration" }).click();
  await page.getByRole("checkbox", { name: "Photography" }).click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 3: dates with season guidance.
  await expect(page.getByRole("heading", { name: "When are you travelling?" })).toBeVisible();
  const { start, end } = await futureTrip();
  await pickDate(page, "Start date", start);
  await pickDate(page, "End date", end);
  await expect(page.getByText("7 days", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 4: travellers (default 2 adults).
  await expect(page.getByRole("heading", { name: "Who is travelling?" })).toBeVisible();
  await expect(page.getByText("2 travellers total.")).toBeVisible();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 5: style.
  await expect(page.getByRole("heading", { name: "How do you want to travel?" })).toBeVisible();
  await page.getByRole("radio", { name: /Private/ }).click();
  // Back navigation retains state.
  await page.getByRole("button", { name: /Back/ }).click();
  await expect(page.getByRole("heading", { name: "Who is travelling?" })).toBeVisible();
  await expect(page.getByText("2 travellers total.")).toBeVisible();
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByRole("heading", { name: "How do you want to travel?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 6: interests.
  await page.getByRole("checkbox", { name: "Elephants" }).click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 7: destinations in order.
  await expect(page.getByRole("heading", { name: /Choose your stops/ })).toBeVisible();
  await page.getByRole("checkbox", { name: "Amboseli National Park" }).click();
  await page.getByRole("checkbox", { name: "Maasai Mara National Reserve" }).click();
  await expect(
    page.getByRole("list", { name: "Your route in order" }).getByRole("listitem").first(),
  ).toContainText("Amboseli");
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 8: stay.
  await page.getByRole("radio", { name: /Luxury/ }).click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 9: transport.
  await page.getByRole("radio", { name: /Land Cruiser/ }).click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 10: activities.
  await expect(page.getByRole("heading", { name: /optional experiences/i })).toBeVisible();
  const balloon = page.getByRole("checkbox", { name: /balloon/i });
  if (await balloon.count()) await balloon.first().click();
  await page.getByRole("button", { name: "Continue →" }).click();

  // Review: itinerary, route, profile — and no invented prices.
  await expect(page.getByRole("heading", { name: "Your safari plan" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Day by day")).toBeVisible();
  await expect(page.getByText("Arrival", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Journey profile")).toBeVisible();
  await expect(page.getByText(/not a scientific score/)).toBeVisible();
  await expect(page.getByText(/\$\s?\d/)).toBeHidden();

  // Send to a planner.
  await page.getByLabel("Full name").fill("Builder E2E");
  await page.getByLabel("Email").fill("builder-e2e@example.com");
  await page.getByRole("button", { name: "Request precise quote" }).click();
  await expect(page.getByText("Plan sent — thank you.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/INQ-\d{4}-[A-Z2-9]{6}/)).toBeVisible();
});

test("builder persists the draft across reload", async ({ page }) => {
  await page.goto("/builder", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Build it your way, step by step" })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("checkbox", { name: "Kenya", exact: true }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await expect(page.getByRole("heading", { name: "What kind of experience?" })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  // Step resets, draft survives.
  await expect(page.getByRole("heading", { name: "Where are you going?" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("checkbox", { name: "Kenya", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
    { timeout: 60_000 },
  );
});

test("builder works on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builder", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Build it your way, step by step" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Continue →" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Kenya", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue →" })).toBeEnabled();
  await expect(page.getByRole("list", { name: "Builder progress" })).toBeVisible();
});
