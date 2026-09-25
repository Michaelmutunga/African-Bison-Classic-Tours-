import { describe, expect, it } from "vitest";
import { about, experiences, getPost, posts } from "@/lib/content";

/**
 * Static editorial content checks. Tours and destinations are database-backed
 * and covered by server/catalogue tests.
 */
describe("static editorial content", () => {
  it("migrates a healthy journal library", () => {
    expect(posts.length).toBeGreaterThanOrEqual(50);
    for (const post of posts) {
      expect(post.paragraphs.length, post.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("looks up posts by slug", () => {
    expect(getPost("no-such-post")).toBeUndefined();
    expect(posts[0]?.slug).toBeTruthy();
  });

  it("covers day experiences", () => {
    expect(experiences.length).toBe(6);
  });

  it("about copy uses the correct business name", () => {
    expect(about.paragraphs.length).toBeGreaterThan(3);
    expect(about.paragraphs.join(" ")).not.toMatch(/\bAfrica Bison Classic Tours\b/);
  });
});
