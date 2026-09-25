import { z } from "zod";
import aboutData from "@/data/content/about.json";
import experiencesData from "@/data/content/experiences.json";
import postsData from "@/data/content/posts.json";

/**
 * Static editorial content (Phase 3). Tours and destinations render from the
 * database (see lib/catalog.ts); journal posts, about copy and day
 * experiences move to the CMS in Phase 11.
 */

const experienceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  location: z.string(),
  excerpt: z.string(),
});

const postSchema = z.object({
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  publishedAt: z.string().nullable(),
  paragraphs: z.array(z.string()),
  sourceUrl: z.string().url(),
});

export type Experience = z.infer<typeof experienceSchema>;
export type Post = z.infer<typeof postSchema>;

function parse<T>(schema: z.ZodType<T>, items: unknown[], label: string): T[] {
  return items.map((item, index) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Invalid ${label} at index ${index}: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

const postsFile = postsData as { posts: unknown[] };
const experiencesFile = experiencesData as { experiences: unknown[] };

// Drop thin migration misses. They stay in posts.json for review, never on site.
export const posts: Post[] = parse(postSchema, postsFile.posts, "post").filter(
  (post) => post.paragraphs.length >= 3,
);
export const experiences: Experience[] = parse(
  experienceSchema,
  experiencesFile.experiences,
  "experience",
);

export const about: { title: string; paragraphs: string[]; sourceUrl: string } = {
  title: (aboutData as { title: string }).title,
  // Fix an obvious source typo: the business name is "African Bison Classic Tours".
  paragraphs: (aboutData as { paragraphs: string[] }).paragraphs.map((p) =>
    p.replace(/\bAfrica Bison Classic Tours\b/g, "African Bison Classic Tours"),
  ),
  sourceUrl: (aboutData as { sourceUrl: string }).sourceUrl,
};

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
