import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToursMaskedHero } from "@/components/tours/tours-masked-hero";

function installStubs(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: () => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  class FakeObserver {
    observe(): void {
      return undefined;
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  }
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: FakeObserver,
  });
}

const IMAGE = {
  src: "/images/hero/landing-savannah-sunset.jpg",
  alt: "Savannah at sunset",
  focal: "50% 62%",
};

function renderHero() {
  render(
    <ToursMaskedHero
      image={IMAGE}
      tourCount={20}
      regionCount={3}
      minDays={1}
      maxDays={12}
    />,
  );
}

describe("ToursMaskedHero sticky backdrop", () => {
  it("announces the full sentence with a pinned image backdrop", () => {
    installStubs(false);
    renderHero();
    expect(
      screen.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeInTheDocument();
    const backdrop = screen.getByTestId("tours-hero-backdrop");
    expect(backdrop).toHaveClass("sticky");
    const photo = backdrop.querySelector("img");
    expect(photo?.getAttribute("src") ?? "").toContain(
      "landing-savannah-sunset",
    );
  });

  it("carries no video anywhere", () => {
    installStubs(false);
    renderHero();
    expect(document.querySelector("video")).toBeNull();
    expect(screen.queryByTestId("tours-hero-video")).toBeNull();
    expect(screen.queryByTestId("tours-hero-pause")).toBeNull();
  });

  it("keeps stats, breadcrumb and both CTAs across the beats", () => {
    installStubs(false);
    renderHero();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("1 to 12 days")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choose your safari" }),
    ).toHaveAttribute("href", "#choose");
    expect(
      screen.getByRole("link", { name: "Enter the dome" }),
    ).toHaveAttribute("href", "#dome");
  });

  it("calm visitors get the same pinned layout with no drift", () => {
    installStubs(true);
    renderHero();
    expect(
      screen.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("tours-hero-backdrop")).toHaveClass("sticky");
    expect(document.querySelector("video")).toBeNull();
  });
});
