import { z } from "zod";
import aboutData from "@/data/content/about.json";
import destinationsData from "@/data/content/destinations.json";
import experiencesData from "@/data/content/experiences.json";
import postsData from "@/data/content/posts.json";
import toursData from "@/data/content/tours.json";

const itineraryDaySchema = z.object({
  n: z.number(),
  title: z.string(),
  body: z.string(),
});

const tourSchema = z.object({
  slug: z.string(),
  title: z.string(),
  category: z.enum(["kenya", "tanzania", "kenya-tanzania", "nairobi-day"]),
  durationDays: z.number(),
  excerpt: z.string(),
  overview: z.array(z.string()),
  itinerary: z.array(itineraryDaySchema),
  includes: z.array(z.string()),
  excludes: z.array(z.string()),
  sourceUrl: z.string().url(),
  sourceUpdated: z.string().nullable(),
});

const destinationSchema = z.object({
  slug: z.string(),
  name: z.string(),
  country: z.string(),
  excerpt: z.string(),
  highlights: z.array(z.string()),
});

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

export type Tour = z.infer<typeof tourSchema>;
export type Destination = z.infer<typeof destinationSchema>;
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

const toursFile = toursData as { tours: unknown[] };
const postsFile = postsData as { posts: unknown[] };
const destinationsFile = destinationsData as { destinations: unknown[] };
const experiencesFile = experiencesData as { experiences: unknown[] };

export const tours: Tour[] = parse(tourSchema, toursFile.tours, "tour");
// Drop thin migration misses (e.g. pages whose content the parser could not
// extract). They stay in posts.json for review, never on the site.
export const posts: Post[] = parse(postSchema, postsFile.posts, "post").filter(
  (post) => post.paragraphs.length >= 3,
);
export const destinations: Destination[] = parse(
  destinationSchema,
  destinationsFile.destinations,
  "destination",
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

export const CATEGORIES = [
  { slug: "kenya", label: "Kenya safaris" },
  { slug: "tanzania", label: "Tanzania safaris" },
  { slug: "kenya-tanzania", label: "Kenya + Tanzania" },
  { slug: "nairobi-day", label: "Nairobi day experiences" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function getTour(slug: string): Tour | undefined {
  return tours.find((t) => t.slug === slug);
}

export function toursByCategory(category: string): Tour[] {
  return tours
    .filter((t) => t.category === category)
    .sort((a, b) => a.durationDays - b.durationDays);
}

export function getDestination(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

/** Match tours whose title mentions a destination name (first word heuristic). */
export function toursForDestination(destinationName: string): Tour[] {
  // The business spells it "Masai Mara" in tour titles, "Maasai" elsewhere.
  const spellingVariants: Record<string, string[]> = {
    maasai: ["maasai", "masai"],
  };
  const token = destinationName
    .replace(/^(Mount|Lake)\s+/i, "")
    .split(/[\s-]+/)[0]
    ?.toLowerCase();
  if (!token || token.length < 4) return [];
  const variants = spellingVariants[token] ?? [token];
  return tours
    .filter((t) => variants.some((v) => t.title.toLowerCase().includes(v)))
    .slice(0, 6);
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
