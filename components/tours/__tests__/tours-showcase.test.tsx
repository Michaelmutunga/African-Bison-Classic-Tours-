import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToursDomeShowcase } from "@/components/tours/tours-dome-showcase";
import { ToursExplorer } from "@/components/tours/tours-explorer";
import { ToursMaskedHero } from "@/components/tours/tours-masked-hero";
import { ToursOptionWheel } from "@/components/tours/tours-option-wheel";
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

// jsdom has no pointer capture; the drag engine calls it on pointerdown.
if (typeof Element.prototype.setPointerCapture !== "function") {
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    writable: true,
    configurable: true,
    value: () => undefined,
  });
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Object.defineProperty(Element.prototype, "releasePointerCapture", {
    writable: true,
    configurable: true,
    value: () => undefined,
  });
}

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
    image: { src: `/images/${slug}.jpg`, alt: `Tour ${slug}`, focal: "50% 40%" },
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

describe("ToursDomeShowcase", () => {
  // jsdom has no layout: every rect is zero, which the gallery treats as
  // "cannot measure, bail out". Stub measurable rects so tiles can open.
  const rect = {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
    toJSON: () => ({}),
  };
  Object.defineProperty(Element.prototype, "getBoundingClientRect", {
    writable: true,
    configurable: true,
    value: () => rect,
  });

  it("lays every journey on the dome with honest labels", () => {
    render(<ToursDomeShowcase tours={tours} activeLabel="Kenya" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Step inside kenya" }),
    ).toBeInTheDocument();
    const maraTiles = screen.getAllByRole("button", {
      name: "Tour mara, 3 days. Open preview",
    });
    expect(maraTiles.length).toBeGreaterThan(0);
  });

  it("opens a preview with a working itinerary link and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ToursDomeShowcase tours={tours} activeLabel="Kenya" />);
    const tile = screen.getAllByRole("button", {
      name: "Tour mara, 3 days. Open preview",
    })[0];
    await user.click(tile);
    const link = await screen.findByRole("link", { name: "View itinerary →" });
    expect(link).toHaveAttribute("href", "/tours/mara");
    // The open guard ignores closes within 250ms of opening.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("link", { name: "View itinerary →" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing without photography", () => {
    const imageless = tours.map((tour) => ({ ...tour, image: null }));
    const { container } = render(
      <ToursDomeShowcase tours={imageless} activeLabel="Kenya" />,
    );
    expect(container).toBeEmptyDOMElement();
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
