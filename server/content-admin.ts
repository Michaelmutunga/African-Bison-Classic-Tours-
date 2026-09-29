import type { PublishStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cachedPublic } from "@/lib/public-cache";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { ConflictError, NotFoundError, slugify, type Actor } from "@/server/catalogue";
import { recordAudit } from "@/server/operations";

export class ContentError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateContent(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
}

async function uniqueBlogSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "post";
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
  }
  throw new ConflictError(`Could not find a unique slug for "${base}"`);
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export const blogInput = z.object({
  title: z.string().trim().min(5).max(200),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().min(10).max(500),
  paragraphs: z.array(z.string().trim().min(1).max(6000)).max(80).default([]),
  author: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(320).optional(),
});

export async function createPost(actor: Actor | null, input: unknown) {
  gateContent(actor);
  const data = blogInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueBlogSlug(data.title);
  try {
    const post = await prisma.blogPost.create({
      data: {
        slug,
        title: data.title,
        excerpt: data.excerpt,
        paragraphs: data.paragraphs,
        author: data.author ?? null,
        category: data.category ?? null,
        tags: data.tags,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        status: "DRAFT",
        createdById: actor?.id ?? null,
      },
    });
    await recordAudit(actor?.id ?? null, "post.created", "post", post.id);
    return post;
  } catch {
    throw new ConflictError(`Post slug "${slug}" already exists`);
  }
}

export async function updatePost(actor: Actor | null, id: string, input: unknown) {
  gateContent(actor);
  const data = blogInput.partial().parse(input);
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Post");
  const slug = data.slug ? slugify(data.slug) : data.title ? await uniqueBlogSlug(data.title, id) : undefined;
  try {
    const post = await prisma.blogPost.update({
      where: { id },
      data: { ...data, ...(slug ? { slug } : {}) },
    });
    await recordAudit(actor?.id ?? null, "post.updated", "post", id);
    return post;
  } catch {
    throw new ConflictError("Post slug already exists");
  }
}

const POST_TRANSITIONS: Record<PublishStatus, PublishStatus[]> = {
  DRAFT: ["SCHEDULED", "PUBLISHED", "ARCHIVED"],
  SCHEDULED: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: ["DRAFT"],
};

export async function setPostStatus(
  actor: Actor | null,
  id: string,
  status: PublishStatus,
  scheduledFor?: string,
  now: Date = new Date(),
) {
  // catalogue.publish is the publish gate; plain writers can stage drafts.
  if (!actor) throw new UnauthorizedError();
  if (status === "DRAFT" || status === "ARCHIVED") {
    if (!hasPermission(actor.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
  } else if (!hasPermission(actor.role, "catalogue.publish")) {
    throw new ForbiddenError("catalogue.publish");
  }
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError("Post");
  if (!POST_TRANSITIONS[post.status].includes(status)) {
    throw new ContentError(`Cannot move post from ${post.status} to ${status}`);
  }
  let scheduled: Date | null = post.scheduledFor;
  if (status === "SCHEDULED") {
    if (!scheduledFor) throw new ContentError("Scheduled posts need a publish date");
    scheduled = new Date(scheduledFor);
    if (!(scheduled > now)) throw new ContentError("Scheduled date must be in the future");
  }
  if (status !== "SCHEDULED") scheduled = null;
  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      status,
      scheduledFor: scheduled,
      publishedAt: status === "PUBLISHED" ? (post.publishedAt ?? now) : post.publishedAt,
    },
  });
  await recordAudit(actor.id, `post.${status.toLowerCase()}`, "post", id);
  return updated;
}

export async function deletePost(actor: Actor | null, id: string) {
  gateContent(actor);
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Post");
  await prisma.blogPost.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "post.deleted", "post", id);
}

export async function listPosts(actor: Actor | null, status?: PublishStatus) {
  gateContent(actor);
  return prisma.blogPost.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

let lastDuePublishAt = 0;
const DUE_PUBLISH_INTERVAL_MS = 60_000;

async function maybePublishDuePosts(now: Date = new Date()): Promise<void> {
  // Flipping due scheduled posts involves a read + a write. Running it on
  // every public page render added hundreds of ms to each request, so it is
  // throttled to at most once per minute per server instance. Tests always
  // run it for determinism; direct publishDuePosts() calls are unaffected.
  if (process.env.NODE_ENV !== "test") {
    if (now.getTime() - lastDuePublishAt < DUE_PUBLISH_INTERVAL_MS) return;
    lastDuePublishAt = now.getTime();
  }
  await publishDuePosts(now).catch(() => undefined);
}

export async function publicPosts() {
  await maybePublishDuePosts();
  return prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
}

export interface PublicPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date | null;
  updatedAt: Date;
}

/**
 * Lightweight card/related-post read. Listing pages only render slug, title,
 * excerpt and date — fetching full paragraphs (up to ~480KB per post across
 * dozens of posts) on every render was a major slowdown.
 */
export async function publicPostSummaries(): Promise<PublicPostSummary[]> {
  await maybePublishDuePosts();
  return cachedPublic("published-post-summaries", () =>
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
  );
}

export async function publicPostBySlug(slug: string) {
  await maybePublishDuePosts();
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED") throw new NotFoundError("Post");
  return post;
}

/** Flip due scheduled posts to published. Returns the count flipped. */
export async function publishDuePosts(now: Date = new Date()): Promise<number> {
  const due = await prisma.blogPost.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: now } },
    select: { id: true },
  });
  if (due.length === 0) return 0;
  await prisma.blogPost.updateMany({
    where: { id: { in: due.map((p) => p.id) } },
    data: { status: "PUBLISHED", publishedAt: now, scheduledFor: null },
  });
  return due.length;
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

export const faqInput = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(10).max(4000),
  order: z.number().int().min(0).max(1000).default(0),
  published: z.boolean().default(true),
});

export async function createFaq(actor: Actor | null, input: unknown) {
  gateContent(actor);
  const data = faqInput.parse(input);
  const faq = await prisma.faq.create({ data });
  await recordAudit(actor?.id ?? null, "faq.created", "faq", faq.id);
  return faq;
}

export async function updateFaq(actor: Actor | null, id: string, input: unknown) {
  gateContent(actor);
  const data = faqInput.partial().parse(input);
  const existing = await prisma.faq.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("FAQ");
  const faq = await prisma.faq.update({ where: { id }, data });
  await recordAudit(actor?.id ?? null, "faq.updated", "faq", id);
  return faq;
}

export async function deleteFaq(actor: Actor | null, id: string) {
  gateContent(actor);
  const existing = await prisma.faq.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("FAQ");
  await prisma.faq.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "faq.deleted", "faq", id);
}

export async function listFaqs(publishedOnly: boolean) {
  return prisma.faq.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Media registry
// ---------------------------------------------------------------------------

export const mediaInput = z.object({
  url: z.string().trim().url().max(2000),
  alt: z.string().trim().min(3).max(200),
  caption: z.string().trim().max(300).optional(),
  credit: z.string().trim().max(200).optional(),
  width: z.number().int().min(1).max(12000).nullable().optional(),
  height: z.number().int().min(1).max(12000).nullable().optional(),
  kind: z.string().trim().max(20).default("image"),
});

export async function createMedia(actor: Actor | null, input: unknown) {
  gateContent(actor);
  const data = mediaInput.parse(input);
  const asset = await prisma.mediaAsset.create({
    data: {
      url: data.url,
      alt: data.alt,
      caption: data.caption ?? null,
      credit: data.credit ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      kind: data.kind,
      createdById: actor?.id ?? null,
    },
  });
  await recordAudit(actor?.id ?? null, "media.created", "media", asset.id);
  return asset;
}

export async function updateMedia(actor: Actor | null, id: string, input: unknown) {
  gateContent(actor);
  const data = mediaInput.partial().parse(input);
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Media asset");
  const asset = await prisma.mediaAsset.update({
    where: { id },
    data: {
      ...data,
      caption: data.caption === undefined ? undefined : (data.caption ?? null),
      credit: data.credit === undefined ? undefined : (data.credit ?? null),
      width: data.width === undefined ? undefined : (data.width ?? null),
      height: data.height === undefined ? undefined : (data.height ?? null),
    },
  });
  await recordAudit(actor?.id ?? null, "media.updated", "media", id);
  return asset;
}

export async function deleteMedia(actor: Actor | null, id: string) {
  gateContent(actor);
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Media asset");
  await prisma.mediaAsset.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "media.deleted", "media", id);
}

export async function listMedia(actor: Actor | null) {
  gateContent(actor);
  return prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

const SETTING_KEY = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

export async function listSettings(actor: Actor | null) {
  gateContent(actor);
  return prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
}

export async function setSetting(actor: Actor | null, key: string, value: string) {
  gateContent(actor);
  if (!SETTING_KEY.test(key) || key.length > 120) {
    throw new ContentError("Setting keys look like business.hours (lowercase, dots, hyphens)");
  }
  if (value.length > 4000) throw new ContentError("Setting values are capped at 4000 characters");
  const setting = await prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  await recordAudit(actor?.id ?? null, "setting.updated", "setting", key);
  return setting;
}
