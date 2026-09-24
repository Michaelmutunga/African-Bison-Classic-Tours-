/*
 * One-shot migration crawler for blog posts + about page (Phase 2).
 * Run: npx tsx scripts/crawl-blog.ts
 * Output: data/content/posts.json, data/content/about.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data", "content");
const BASE = "https://africanbisonclassictours.com";
const UA = { "User-Agent": "ABCT-Migration/1.0" };

function clean(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#0*160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#8217;/g, "'")
    .replace(/&#0*(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#[a-z0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\bthe the\b/gi, "the")
    .trim();
}

async function fetchHtml(url: string, attempts = 3): Promise<string> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`fetch failed for ${url}`);
}

interface PostLink {
  url: string;
  title: string;
}

async function collectIndexPages(): Promise<PostLink[]> {
  const links = new Map<string, string>();
  for (let page = 1; page <= 6; page++) {
    const url = page === 1 ? `${BASE}/blog/` : `${BASE}/blog/page/${page}/`;
    let html: string;
    try {
      html = await fetchHtml(url);
    } catch {
      break;
    }
    const matches = [
      ...html.matchAll(
        /class="[^"]*entry-title[^"]*"[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
      ),
    ];
    if (matches.length === 0) break;
    for (const m of matches) {
      const postUrl = m[1] ?? "";
      const title = clean(m[2] ?? "");
      if (postUrl.startsWith(BASE) && title && !links.has(postUrl)) links.set(postUrl, title);
    }
    console.log(`index page ${page}: ${matches.length} posts`);
    await new Promise((r) => setTimeout(r, 500));
  }
  return [...links.entries()].map(([url, title]) => ({ url, title }));
}

const POST_JUNK =
  /Table of Contents|^\*\s|Pingback:|Comments are closed|Facebook page|©|Web Design/i;

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  paragraphs: string[];
  sourceUrl: string;
}

async function crawlPost(link: PostLink): Promise<Post> {
  const html = await fetchHtml(link.url);
  const ogTitle =
    html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]?.replace(
      /\s*-\s*African Bison Classic Tours\s*$/,
      "",
    ) ?? link.title;
  const published =
    html.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1] ??
    html.match(/class="[^"]*entry-date[^"]*"[^>]*>.*?(20\d\d-\d\d-\d\d)/)?.[1] ??
    null;

  const start = html.indexOf("entry-content");
  const region = start >= 0 ? html.slice(start, start + 120_000) : html;
  const paras = region
    .split(/<\/p>/i)
    .map((chunk) => clean(chunk))
    .filter((p) => p.length > 80 && !POST_JUNK.test(p))
    .slice(0, 40);

  const slug = link.url.replace(`${BASE}/`, "").replace(/\/$/, "");
  return {
    slug,
    title: ogTitle.trim() || link.title,
    excerpt: paras[0]?.slice(0, 220) ?? link.title,
    publishedAt: published,
    paragraphs: paras,
    sourceUrl: link.url,
  };
}

const ABOUT_JUNK =
  /©|Web Design|Search:|Skip to content|Facebook page|Twitter page|Instagram page|Whatsapp page|Kenya Safaris|Tanzania Safaris|Book Now|Contact Us|About Us|Uganda Safaris|{\s*"|stylesheet/i;

async function crawlAbout() {
  const html = await fetchHtml(`${BASE}/about-us-2/`);
  const seen = new Set<string>();
  const paragraphs = html
    .split(/<\/(?:div|p|li|h[1-4])>/i)
    .map((chunk) => clean(chunk))
    .filter((p) => {
      if (p.length < 120 || p.length > 3000 || ABOUT_JUNK.test(p) || seen.has(p)) return false;
      seen.add(p);
      return true;
    })
    .slice(0, 12);
  return {
    title: "About African Bison Classic Tours",
    paragraphs,
    sourceUrl: `${BASE}/about-us-2/`,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const links = await collectIndexPages();
  console.log(`total posts: ${links.length}`);
  const posts: Post[] = [];
  const queue = [...links];
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length > 0) {
      const link = queue.shift();
      if (!link) return;
      try {
        const post = await crawlPost(link);
        posts.push(post);
        console.log(`ok   ${post.slug} (${post.paragraphs.length} paras)`);
      } catch (error) {
        console.error(`fail ${(error as Error).message} ${link.url}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  });
  await Promise.all(workers);
  posts.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  writeFileSync(
    join(OUT_DIR, "posts.json"),
    `${JSON.stringify({ migratedAt: new Date().toISOString(), source: BASE, posts }, null, 2)}\n`,
  );
  const about = await crawlAbout();
  writeFileSync(
    join(OUT_DIR, "about.json"),
    `${JSON.stringify({ migratedAt: new Date().toISOString(), ...about }, null, 2)}\n`,
  );
  console.log(`\nwrote ${posts.length} posts, about (${about.paragraphs.length} paras)`);
}

void main();
