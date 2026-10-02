import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandOrbit } from "@/components/brand-orbit";
import { isHeroRoute } from "@/components/site-header";

describe("isHeroRoute", () => {
  it("stays transparent only on dark-hero index pages", () => {
    expect(isHeroRoute("/")).toBe(true);
    expect(isHeroRoute("/tours")).toBe(true);
    expect(isHeroRoute("/destinations")).toBe(true);
    expect(isHeroRoute("/experiences")).toBe(true);
    expect(isHeroRoute("/blog")).toBe(true);
  });

  it("uses the solid header on detail and app pages (nav stays visible)", () => {
    for (const pathname of [
      "/tours/amboseli-elephants",
      "/destinations/masai-mara",
      "/blog/packing-guide",
      "/experiences/some-experience",
      "/about",
      "/contact",
      "/builder",
      "/login",
      "/staff/login",
      "/register",
      "/dashboard",
      "/admin",
      "/admin/tours",
    ]) {
      expect(isHeroRoute(pathname)).toBe(false);
    }
  });

  it("handles null pathname", () => {
    expect(isHeroRoute(null)).toBe(false);
  });
});

describe("BrandOrbit size", () => {
  it("renders a large legible logo by default", () => {
    render(<BrandOrbit tone="text-ink" />);
    const logo = document.querySelector("img");
    expect(Number(logo?.getAttribute("width"))).toBeGreaterThanOrEqual(72);
  });
});
