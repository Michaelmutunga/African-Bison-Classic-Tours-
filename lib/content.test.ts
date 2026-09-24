import { describe, expect, it } from "vitest";
import {
  about,
  destinations,
  experiences,
  getDestination,
  getPost,
  getTour,
  posts,
  tours,
  toursByCategory,
  toursForDestination,
} from "@/lib/content";

describe("migrated catalogue", () => {
  it("contains the full published inventory", () => {
    expect(tours.length).toBe(43);
    expect(toursByCategory("kenya").length).toBeGreaterThanOrEqual(20);
    expect(toursByCategory("tanzania").length).toBeGreaterThanOrEqual(9);
    expect(toursByCategory("kenya-tanzania").length).toBeGreaterThanOrEqual(9);
  });

  it("every tour has substance and a source", () => {
    for (const tour of tours) {
      expect(tour.title.length, tour.slug).toBeGreaterThan(5);
      expect(tour.overview.length, tour.slug).toBeGreaterThan(0);
      // The 1-day Nairobi page has no sidebar lists on the source site.
      if (tour.category !== "nairobi-day") {
        expect(tour.includes.length, tour.slug).toBeGreaterThan(0);
      }
      expect(tour.sourceUrl, tour.slug).toContain("africanbisonclassictours.com");
      for (const day of tour.itinerary) {
        expect(day.title, `${tour.slug} day ${day.n}`).toMatch(/Day\s*\d+/i);
        expect(day.body.length, `${tour.slug} day ${day.n}`).toBeGreaterThan(20);
      }
    }
  });

  it("looks up tours, destinations and posts by slug", () => {
    expect(getTour("3-days-masai-mara-game-reserve-safari")?.durationDays).toBe(3);
    expect(getTour("no-such-tour")).toBeUndefined();
    expect(getDestination("serengeti")?.country).toBe("Tanzania");
    expect(getPost("no-such-post")).toBeUndefined();
  });

  it("relates tours to destinations", () => {
    expect(toursForDestination("Maasai Mara National Reserve").length).toBeGreaterThan(3);
    expect(toursForDestination("Serengeti National Park").length).toBeGreaterThan(3);
  });

  it("migrates a healthy journal library", () => {
    expect(posts.length).toBeGreaterThanOrEqual(50);
    for (const post of posts) {
      expect(post.paragraphs.length, post.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("covers destinations and day experiences", () => {
    expect(destinations.length).toBe(16);
    expect(experiences.length).toBe(6);
  });

  it("about copy uses the correct business name", () => {
    expect(about.paragraphs.length).toBeGreaterThan(3);
    expect(about.paragraphs.join(" ")).not.toMatch(/\bAfrica Bison Classic Tours\b/);
  });
});
