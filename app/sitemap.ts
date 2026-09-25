import type { MetadataRoute } from "next";
import { publicDestinations, publicTours } from "@/lib/catalog";
import { posts } from "@/lib/content";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "",
    "/tours",
    "/destinations",
    "/experiences",
    "/blog",
    "/about",
    "/contact",
    "/faq",
    "/travel-information",
  ];
  let tours: Awaited<ReturnType<typeof publicTours>> = [];
  let destinations: Awaited<ReturnType<typeof publicDestinations>> = [];
  try {
    [tours, destinations] = await Promise.all([publicTours(), publicDestinations()]);
  } catch {
    // Build-time database absence: sitemap degrades to static pages only.
  }
  return [
    ...staticPages.map((path) => ({
      url: `${SITE_URL}${path || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...tours.map((tour) => ({
      url: `${SITE_URL}/tours/${tour.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...destinations.map((destination) => ({
      url: `${SITE_URL}/destinations/${destination.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
