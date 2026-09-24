import type { MetadataRoute } from "next";
import { destinations, posts, tours } from "@/lib/content";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

export default function sitemap(): MetadataRoute.Sitemap {
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
  return [
    ...staticPages.map((path) => ({
      url: `${SITE_URL}${path || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...tours.map((tour) => ({
      url: `${SITE_URL}/tours/${tour.slug}`,
      lastModified: tour.sourceUpdated ? new Date(tour.sourceUpdated) : new Date(),
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
