import { z } from "zod";
import aboutData from "@/data/content/about.json";
import experiencesData from "@/data/content/experiences.json";

/**
 * Static editorial content. Tours, destinations, posts and FAQs render from
 * the database (CMS, Phase 11); about copy and day experiences follow in a
 * later pass.
 */

const experienceSchema = z.object({
  slug: z.string(),
  name: z.string(),
  location: z.string(),
  excerpt: z.string(),
});

export type Experience = z.infer<typeof experienceSchema>;

function parse<T>(schema: z.ZodType<T>, items: unknown[], label: string): T[] {
  return items.map((item, index) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Invalid ${label} at index ${index}: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

const experiencesFile = experiencesData as { experiences: unknown[] };

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

export function formatDate(iso: string | Date | null): string | null {
  if (iso instanceof Date) {
    return iso.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
