import { describe, expect, it } from "vitest";
import { about, experiences } from "@/lib/content";

/**
 * Static editorial content checks. Posts and FAQs are database-backed
 * (CMS) and covered by server/content tests.
 */
describe("static editorial content", () => {
  it("covers day experiences", () => {
    expect(experiences.length).toBe(6);
  });

  it("about copy uses the correct business name", () => {
    expect(about.paragraphs.length).toBeGreaterThan(3);
    expect(about.paragraphs.join(" ")).not.toMatch(/\bAfrica Bison Classic Tours\b/);
  });
});
