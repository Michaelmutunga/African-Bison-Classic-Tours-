import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToursExplorer } from "@/components/tours/tours-explorer";
import { ToursMaskedHero } from "@/components/tours/tours-masked-hero";
import { ToursOptionWheel } from "@/components/tours/tours-option-wheel";
import { ToursStackReveal } from "@/components/tours/tours-stack-reveal";
import type { ShowcaseCategory, ShowcaseTour } from "@/components/tours/showcase";

// This jsdom setup has no browser APIs yet: stub the two that motion
// primitives and the calm hooks touch (same stubs as hero-motion.test.tsx).
function installBrowserStubs() {
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
  if (typeof globalThis.IntersectionObserver === "undefined") {
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
      value: FakeObserver,
    });
  }
}
installBrowserStubs();

const categories: ShowcaseCategory[] = [
  { slug: "kenya", label: "Kenya", count: 2 },
  { slug: "tanzania", label: "Tanzania", count: 1 },
];

function tour(
  slug: string,
  categorySlug: string,
  categoryLabel: string,
  durationDays: number,
): ShowcaseTour {
  return {
    slug,
    title: `Tour ${slug}`,
    categorySlug,
    categoryLabel,
    durationDays,
    excerpt: "A real itinerary excerpt.",
    image: null,
  };
}

const tours: ShowcaseTour[] = [
  tour("mara", "kenya", "Kenya", 3),
  tour("amboseli", "kenya", "Kenya", 5),
  tour("serengeti", "tanzania", "Tanzania", 7),
];

describe("ToursMaskedHero", () => {
  it("renders the headline, honest stats and breadcrumb", () => {
    render(
      <ToursMaskedHero
        image={null}
        tourCount={12}
        regionCount={3}
        minDays={1}
        maxDays={12}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: /journeys across/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("1 to 12 days")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choose your safari" }),
    ).toHaveAttribute("href", "#choose");
  });
});

describe("ToursOptionWheel", () => {
  const options: ShowcaseCategory[] = [
    { slug: "all", label: "All safaris", count: 3 },
    ...categories,
  ];

  it("exposes every region as a radio with its count", () => {
    render(
      <ToursOptionWheel
        options={options}
        active="all"
        onSelect={() => {}}
        activeCount={3}
        activeLabel="All safaris"
        rangeText="3 to 7 days"
      />,
    );
    const group = screen.getByRole("radiogroup", {
      name: "Filter safaris by region",
    });
    expect(group).toBeInTheDocument();
    expect(
      within(group).getByRole("radio", { name: "Kenya, 2 safaris" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      within(group).getByRole("radio", { name: "All safaris, 3 safaris" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("notifies the parent when a region is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ToursOptionWheel
        options={options}
        active="all"
        onSelect={onSelect}
        activeCount={3}
        activeLabel="All safaris"
        rangeText={null}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Kenya, 2 safaris" }));
    expect(onSelect).toHaveBeenCalledWith("kenya");
  });

  it("moves with arrow keys", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ToursOptionWheel
        options={options}
        active="all"
        onSelect={onSelect}
        activeCount={3}
        activeLabel="All safaris"
        rangeText={null}
      />,
    );
    const active = screen.getByRole("radio", { name: "All safaris, 3 safaris" });
    active.focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("kenya");
  });
});

describe("ToursStackReveal", () => {
  const deck = [tours[0], tours[1]];

  it("shows the front journey with a working itinerary link", () => {
    render(<ToursStackReveal tours={deck} activeLabel="Kenya" />);
    expect(screen.getByText("01 / 02")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View itinerary: Tour mara" }),
    ).toHaveAttribute("href", "/tours/mara");
  });

  it("brings the back card forward on previous", async () => {
    const user = userEvent.setup();
    render(<ToursStackReveal tours={deck} activeLabel="Kenya" />);
    await user.click(
      screen.getByRole("button", { name: "Bring back card to front" }),
    );
    expect(screen.getByText("02 / 02")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View itinerary: Tour amboseli" }),
    ).toBeInTheDocument();
  });
});

describe("ToursExplorer", () => {
  it("lists every journey with deep links and filters by wheel choice", async () => {
    const user = userEvent.setup();
    render(
      <ToursExplorer tours={tours} categories={categories} initialCategory="all" />,
    );
    expect(screen.getByRole("link", { name: "Tour mara, 3 days" })).toHaveAttribute(
      "href",
      "/tours/mara",
    );
    await user.click(screen.getByRole("radio", { name: "Tanzania, 1 safari" }));
    expect(
      screen.queryByRole("link", { name: "Tour mara, 3 days" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Tour serengeti, 7 days" }),
    ).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(
      "/tours?category=tanzania",
    );
  });

  it("falls back to all safaris for an unknown initial category", () => {
    render(
      <ToursExplorer tours={tours} categories={categories} initialCategory="nope" />,
    );
    expect(screen.getByRole("link", { name: "Tour mara, 3 days" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tour serengeti, 7 days" })).toBeInTheDocument();
  });
});
