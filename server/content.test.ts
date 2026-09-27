import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { testActor, unique } from "@/tests/db";
import {
  ContentError,
  createFaq,
  createMedia,
  createPost,
  deleteFaq,
  deleteMedia,
  deletePost,
  listFaqs,
  listMedia,
  listSettings,
  publicPostBySlug,
  publicPosts,
  publishDuePosts,
  setPostStatus,
  setSetting,
  updateFaq,
  updateMedia,
  updatePost,
} from "@/server/content-admin";
import { ConflictError, NotFoundError } from "@/server/catalogue";

const admin = testActor("ADMIN");
const editor = testActor("CONTENT_MANAGER");
const consultant = testActor("SAFARI_CONSULTANT");

describe("blog lifecycle", () => {
  it("creates drafts invisible to the public, then publishes", async () => {
    const slug = unique("test-post");
    const post = await createPost(admin, {
      title: "Test Post About Safaris",
      slug,
      excerpt: "An excerpt with enough words to pass validation here.",
      paragraphs: ["First paragraph with enough words to be valid content."],
    });
    expect(post.status).toBe("DRAFT");
    expect((await publicPosts()).map((p) => p.id)).not.toContain(post.id);

    await setPostStatus(editor, post.id, "PUBLISHED");
    const visible = await publicPostBySlug(slug);
    expect(visible.id).toBe(post.id);
    await deletePost(admin, post.id);
    await expect(publicPostBySlug(slug)).rejects.toThrow(NotFoundError);
  });

  it("schedules future posts and flips them when due", async () => {
    const post = await createPost(admin, {
      title: unique("Scheduled Post About Kenya"),
      excerpt: "An excerpt with enough words to pass validation here.",
      paragraphs: ["Body paragraph with enough words to be valid content."],
    });
    const future = new Date(Date.now() + 86_400_000).toISOString();
    await setPostStatus(editor, post.id, "SCHEDULED", future);
    expect((await publicPosts()).map((p) => p.id)).not.toContain(post.id);
    expect(await publishDuePosts(new Date(Date.now() + 2 * 86_400_000))).toBeGreaterThanOrEqual(1);
    expect((await publicPostBySlug(post.slug)).status).toBe("PUBLISHED");
    // Past dates and bad transitions are rejected.
    const post2 = await createPost(admin, {
      title: unique("Another Post About Kenya"),
      excerpt: "An excerpt with enough words to pass validation here.",
      paragraphs: ["Body paragraph with enough words to be valid content."],
    });
    await expect(setPostStatus(editor, post2.id, "SCHEDULED", new Date("2020-01-01").toISOString())).rejects.toThrow(
      ContentError,
    );
    await setPostStatus(editor, post2.id, "PUBLISHED");
    await expect(setPostStatus(editor, post2.id, "SCHEDULED", future)).rejects.toThrow(ContentError);
    await deletePost(admin, post.id);
    await deletePost(admin, post2.id);
  });

  it("renames slugs so old URLs 404", async () => {
    const post = await createPost(admin, {
      title: unique("Slug Post About Kenya"),
      excerpt: "An excerpt with enough words to pass validation here.",
      paragraphs: ["Body paragraph with enough words to be valid content."],
    });
    const oldSlug = post.slug;
    await setPostStatus(editor, post.id, "PUBLISHED");
    const renamed = await updatePost(admin, post.id, { slug: unique("renamed-post") });
    expect(renamed.slug).not.toBe(oldSlug);
    await expect(publicPostBySlug(oldSlug)).rejects.toThrow(NotFoundError);
    expect((await publicPostBySlug(renamed.slug)).id).toBe(post.id);
    await deletePost(admin, post.id);
  });

  it("stores SEO overrides", async () => {
    const post = await createPost(admin, {
      title: unique("SEO Post About Kenya"),
      excerpt: "An excerpt with enough words to pass validation here.",
      paragraphs: ["Body paragraph with enough words to be valid content."],
      seoTitle: "Custom SEO title here",
      seoDescription: "Custom SEO description here.",
    });
    expect(post.seoTitle).toBe("Custom SEO title here");
    await deletePost(admin, post.id);
  });

  it("rejects duplicates and enforces permissions", async () => {
    const slug = unique("dup-post");
    const post = await createPost(admin, {
      title: "Duplicate Test Post",
      slug,
      excerpt: "An excerpt with enough words to pass validation here.",
      paragraphs: ["Body paragraph with enough words to be valid content."],
    });
    await expect(
      createPost(admin, {
        title: "Duplicate Test Post Two",
        slug,
        excerpt: "An excerpt with enough words to pass validation here.",
        paragraphs: ["Body paragraph with enough words to be valid content."],
      }),
    ).rejects.toThrow(ConflictError);
    await expect(
      createPost(consultant, {
        title: "Consultant Test Post",
        excerpt: "An excerpt with enough words to pass validation here.",
        paragraphs: ["Body paragraph with enough words to be valid content."],
      }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      createPost(null, {
        title: "Anonymous Test Post",
        excerpt: "An excerpt with enough words to pass validation here.",
        paragraphs: ["Body paragraph with enough words to be valid content."],
      }),
    ).rejects.toThrow(UnauthorizedError);
    // Writers stage drafts; only publishers publish.
    await expect(setPostStatus(consultant, post.id, "PUBLISHED")).rejects.toThrow(ForbiddenError);
    await deletePost(admin, post.id);
  });
});

describe("faqs", () => {
  it("manages ordered faqs with visibility", async () => {
    const faq = await createFaq(admin, {
      question: unique("Is this a test question about safaris?"),
      answer: "Yes, and this answer is long enough to pass validation.",
      order: 99,
      published: false,
    });
    expect((await listFaqs(true)).map((f) => f.id)).not.toContain(faq.id);
    await updateFaq(admin, faq.id, { published: true, order: 1 });
    const visible = await listFaqs(true);
    expect(visible.map((f) => f.id)).toContain(faq.id);
    for (let i = 1; i < visible.length; i++) {
      expect(visible[i - 1]?.order ?? 0).toBeLessThanOrEqual(visible[i]?.order ?? 0);
    }
    await expect(updateFaq(admin, "ck00000000000000000000000", { question: "x".repeat(10) })).rejects.toThrow(
      NotFoundError,
    );
    await deleteFaq(admin, faq.id);
    expect(await prisma.faq.findUnique({ where: { id: faq.id } })).toBeNull();
  });
});

describe("media registry", () => {
  it("requires URLs and alt text", async () => {
    const asset = await createMedia(admin, {
      url: "https://example.com/mara.jpg",
      alt: "Elephants in Amboseli",
      credit: "Staff photo",
    });
    expect(asset.alt).toBe("Elephants in Amboseli");
    await expect(
      createMedia(admin, { url: "not-a-url", alt: "Missing alt here yes" }),
    ).rejects.toThrow();
    await expect(createMedia(admin, { url: "https://example.com/x.jpg", alt: "x" })).rejects.toThrow();
    const updated = await updateMedia(admin, asset.id, { caption: "Morning herd" });
    expect(updated.caption).toBe("Morning herd");
    expect((await listMedia(admin)).map((a) => a.id)).toContain(asset.id);
    await expect(updateMedia(consultant, asset.id, { alt: "Hacked alt text here" })).rejects.toThrow(
      ForbiddenError,
    );
    await deleteMedia(admin, asset.id);
  });
});

describe("site settings", () => {
  it("reads and writes validated keys", async () => {
    const key = unique("test.setting");
    await setSetting(admin, key, "hello");
    expect((await listSettings(admin)).find((s) => s.key === key)?.value).toBe("hello");
    await expect(setSetting(admin, "BAD KEY!", "x")).rejects.toThrow(ContentError);
    await expect(setSetting(consultant, key, "y")).rejects.toThrow(ForbiddenError);
    await prisma.siteSetting.delete({ where: { key } });
  });
});
