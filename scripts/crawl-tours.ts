/*
 * One-shot migration crawler (Phase 2).
 * Fetches live WordPress tour pages and extracts structured data.
 * Output: data/content/tours.json — committed as the migration source.
 *
 * Run: npx tsx scripts/crawl-tours.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "content", "tours.json");
const BASE = "https://africanbisonclassictours.com";

interface TourDef {
  slug: string;
  category: "kenya" | "tanzania" | "kenya-tanzania" | "nairobi-day";
}

const TOURS: TourDef[] = [
  { slug: "2-days-aberdare-national-park-safari", category: "kenya" },
  { slug: "2-days-amboseli-national-park-safari", category: "kenya" },
  { slug: "2-days-lake-nakuru-national-park-safari", category: "kenya" },
  { slug: "3-days-amboseli-national-park-safari", category: "kenya" },
  { slug: "3-days-lake-nakuru-national-park-safari", category: "kenya" },
  { slug: "3-days-masai-mara-game-reserve-safari", category: "kenya" },
  { slug: "4-days-amboseli-national-park-masai-mara-safari", category: "kenya" },
  { slug: "4-days-masai-mara-lake-nakuru-national-park-safari", category: "kenya" },
  { slug: "4-days-lake-naivasha-masai-mara-game-reserve-safari", category: "kenya" },
  { slug: "4-days-great-masai-mara-migration-and-balloon-safari", category: "kenya" },
  { slug: "5-days-samburu-lake-nakuru-and-lake-naivasha-safari", category: "kenya" },
  { slug: "5-days-lake-nakuru-bogoria-naivasha-masai-mara-safari", category: "kenya" },
  { slug: "5-days-amboseli-lake-naivasha-masai-mara-safari", category: "kenya" },
  { slug: "6-days-amboseli-aberdares-lake-nakuru-masai-mara-safari", category: "kenya" },
  { slug: "7-days-tsavo-west-tsavo-east-amboseli-lake-naivasha-masai-mara-safari", category: "kenya" },
  { slug: "7-days-amboseli-lake-nakuru-masai-mara-safari", category: "kenya" },
  { slug: "7-days-aberdares-samburu-lake-nakuru-masai-mara-safari", category: "kenya" },
  { slug: "7-days-best-of-kenya-safari-tour", category: "kenya" },
  { slug: "8-days-amboseli-samburu-aberdares-lake-nakuru-masai-mara-safari", category: "kenya" },
  { slug: "8-days-aberdares-samburu-sweetwaters-lake-nakuru-masai-mara-safari", category: "kenya" },
  { slug: "10-days-kenya-wildlife-adventure-safari", category: "kenya" },
  { slug: "10-days-kenya-honeymoon-safari-adventure", category: "kenya" },
  { slug: "3-days-serengeti-national-park-safari", category: "tanzania" },
  { slug: "4-days-tarangire-ngorongoro-crater-lake-manyara-safari", category: "tanzania" },
  { slug: "4-days-ngorongoro-crater-serengeti-national-park-safari", category: "tanzania" },
  { slug: "4-days-lake-manyara-ngorongoro-crater-serengeti-safari", category: "tanzania" },
  { slug: "5-days-lake-manyara-ngorongoro-crater-serengeti-safari", category: "tanzania" },
  { slug: "5-days-lake-manyara-ngorongoro-crater-tarangire-safari", category: "tanzania" },
  { slug: "6-days-lake-manyara-ngorongoro-crater-serengeti-safari", category: "tanzania" },
  { slug: "6-days-best-of-tanzania-adventure-safari", category: "tanzania" },
  { slug: "7-days-lake-manyara-serengeti-ngorongoro-tarangire-safari", category: "tanzania" },
  { slug: "8-days-lake-manyara-ngorongoro-serengeti-wildebeest-migration-safari", category: "tanzania" },
  { slug: "7-days-lake-nakuru-masai-mara-serengeti-ngorongoro-crater-safari", category: "kenya-tanzania" },
  { slug: "8-days-masai-mara-lake-nakuru-serengeti-ngorongoro-crater-safari", category: "kenya-tanzania" },
  { slug: "8-days-lake-nakuru-amboseli-lake-manyara-serengeti-ngorongoro-crater", category: "kenya-tanzania" },
  { slug: "9-days-masai-mara-lake-nakuru-amboseli-serengeti-ngorongoro-crater-safari", category: "kenya-tanzania" },
  { slug: "9-days-amboseli-serengeti-lake-manyara-ngorongoro-crater-safari", category: "kenya-tanzania" },
  { slug: "10-days-kenya-tanzania-amazing-wildlife-safari", category: "kenya-tanzania" },
  { slug: "12-days-kenya-tanzania-wildlife-safari", category: "kenya-tanzania" },
  { slug: "12-days-best-of-kenya-tanzania-wildlife-safari", category: "kenya-tanzania" },
  { slug: "14-days-kenya-tanzania-wildlife-safari", category: "kenya-tanzania" },
  { slug: "15-days-best-of-kenya-tanzania-combined-wildlife-safari", category: "kenya-tanzania" },
  { slug: "1-day-tour-nairobi-safari-culture-wildlife-iconic-attractions", category: "nairobi-day" },
];

const TYPOS: Array<[RegExp, string]> = [
  [/\bteh\b/gi, "the"],
  [/\brecieve\b/gi, "receive"],
  [/\baccomodation\b/gi, "accommodation"],
  [/\bseperate\b/gi, "separate"],
  [/\boccassion\b/gi, "occasion"],
  [/\bexperiance\b/gi, "experience"],
  [/\bsafai\b/gi, "safari"],
  [/\bthe the\b/gi, "the"],
  [/\ba an\b/gi, "an"],
  [/\bMasai Mara Game Reserve Safari Safari\b/g, "Masai Mara Game Reserve Safari"],
];

function clean(text: string): string {
  let out = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#0*(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, fix] of TYPOS) out = out.replace(pattern, fix);
  return out;
}

function paragraphs(html: string): string[] {
  return html
    .split(/<\/p>/i)
    .map((chunk) => clean(chunk))
    .filter((p) => p.length > 60);
}

function listAfter(html: string, marker: string): string[] {
  const idx = html.indexOf(marker);
  if (idx < 0) return [];
  const ulStart = html.indexOf("<ul", idx);
  const ulEnd = html.indexOf("</ul>", ulStart);
  if (ulStart < 0 || ulEnd < 0) return [];
  const ul = html.slice(ulStart, ulEnd);
  return ul
    .split(/<\/li>/i)
    .map((chunk) => clean(chunk))
    .filter((item) => item.length > 3);
}

interface ItineraryDay {
  n: number;
  title: string;
  body: string;
}

function itinerary(html: string): ItineraryDay[] {
  const heading = /<h4 class="ult-responsive info-list-heading"[^>]*>(.*?)<\/h4>/gi;
  const matches = [...html.matchAll(heading)];
  const days: ItineraryDay[] = [];
  for (let i = 0; i < matches.length; i++) {
    const title = clean(matches[i]?.[1] ?? "");
    // Skip non-day headings such as "Safari Highlights".
    const nMatch = title.match(/Day\s*(\d+)/i);
    if (!nMatch) continue;
    const start = (matches[i]?.index ?? 0) + (matches[i]?.[0]?.length ?? 0);
    const end = matches[i + 1]?.index ?? html.indexOf("</ul>", start);
    const bodyHtml = html.slice(start, end < 0 ? start : end);
    const body = paragraphs(bodyHtml).join("\n\n");
    days.push({ n: Number(nMatch[1]), title, body });
  }
  return days;
}

const JUNK =
  /©|Web Design|Search:|You are here|Skip to content|Facebook page|Twitter page|Instagram page|Whatsapp page|Comments are closed|Pingback:|Kenya Safaris|Tanzania Safaris|Book Now|Contact Us|About Us|Uganda Safaris|{\s*"|stylesheet|javascript/i;

function overviewFrom(html: string): string[] {
  const itinIdx = html.indexOf("Itinerary Details");
  const pre = html.slice(0, itinIdx > 0 ? itinIdx : html.length);
  const seen = new Set<string>();
  return pre
    .split(/<\/(?:div|p|li|h[1-4])>/i)
    .map((chunk) => clean(chunk))
    .filter((p) => {
      if (p.length < 120 || p.length > 3000 || JUNK.test(p) || seen.has(p)) return false;
      seen.add(p);
      return true;
    })
    .slice(0, 3);
}

async function fetchHtml(url: string, attempts = 3): Promise<string> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ABCT-Migration/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed for ${url}`);
}

async function crawlOne(def: TourDef) {
  const url = `${BASE}/${def.slug}/`;
  const html = await fetchHtml(url);

  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? def.slug;
  const title = ogTitle.replace(/\s*-\s*African Bison Classic Tours\s*$/, "").trim();
  const updated = html.match(/<meta property="og:updated_time" content="([^"]+)"/)?.[1];

  const overview = overviewFrom(html);
  const excerpt = overview[0]?.slice(0, 220) ?? title;

  const days = itinerary(html);
  const includes = listAfter(html, "Price includes:");
  const excludes = listAfter(html, "Not included:");

  const daysMatch = title.match(/(\d+)\s*Days?/i);
  const durationDays = daysMatch ? Number(daysMatch[1]) : days.length || 1;

  return {
    slug: def.slug,
    title,
    category: def.category,
    durationDays,
    excerpt,
    overview,
    itinerary: days,
    includes,
    excludes,
    sourceUrl: url,
    sourceUpdated: updated ?? null,
  };
}

async function main() {
  const results: Awaited<ReturnType<typeof crawlOne>>[] = [];
  const failed: string[] = [];
  const queue = [...TOURS];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0) {
      const def = queue.shift();
      if (!def) return;
      try {
        const tour = await crawlOne(def);
        results.push(tour);
        console.log(`ok   ${def.slug} (${tour.itinerary.length} days)`);
      } catch (error) {
        failed.push(def.slug);
        console.error(`fail ${def.slug}: ${(error as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => a.slug.localeCompare(b.slug));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ migratedAt: new Date().toISOString(), source: BASE, tours: results }, null, 2)}\n`);
  console.log(`\nwrote ${results.length} tours -> ${OUT}`);
  if (failed.length > 0) {
    console.log(`failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

void main();
