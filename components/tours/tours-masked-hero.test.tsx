import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  if (typeof HTMLVideoElement !== "undefined") {
    vi.spyOn(HTMLVideoElement.prototype, "play").mockImplementation(
      () => Promise.resolve(),
    );
    vi.spyOn(HTMLVideoElement.prototype, "pause").mockImplementation(
      () => undefined,
    );
  }
}

const IMAGE = {
  src: "/images/hero/landing-savannah-sunset.jpg",
  alt: "Savannah at sunset",
  focal: "50% 62%",
};

describe("ToursMaskedHero video-text", () => {
  it("announces the full sentence with video inside JOURNEYS", () => {
    installStubs(false);
    render(
      <ToursMaskedHero
        image={IMAGE}
        videoSrc="/video/hero.mp4"
        tourCount={20}
        regionCount={3}
        minDays={1}
        maxDays={12}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeInTheDocument();
    const video = screen.getByTestId("tours-hero-video");
    expect(video).toHaveAttribute("src", "/video/hero.mp4");
    expect(video).toHaveAttribute("muted");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(
      screen.getByRole("link", { name: "Choose your safari" }),
    ).toHaveAttribute("href", "#choose");
    expect(
      screen.getByRole("link", { name: "Enter the dome" }),
    ).toHaveAttribute("href", "#dome");
  });

  it("pause control toggles and stays in the tab order", () => {
    installStubs(false);
    render(
      <ToursMaskedHero
        image={IMAGE}
        videoSrc="/video/hero.mp4"
        tourCount={20}
        regionCount={3}
        minDays={1}
        maxDays={12}
      />,
    );
    const pause = screen.getByTestId("tours-hero-pause");
    expect(pause).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(pause);
    expect(pause).toHaveAttribute("aria-pressed", "true");
    expect(pause).toHaveAccessibleName("Play background video");
    fireEvent.click(pause);
    expect(pause).toHaveAttribute("aria-pressed", "false");
  });

  it("calm visitors get solid type with no video", async () => {
    installStubs(true);
    render(
      <ToursMaskedHero
        image={IMAGE}
        videoSrc="/video/hero.mp4"
        tourCount={20}
        regionCount={3}
        minDays={1}
        maxDays={12}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeInTheDocument();
    // Calm settles after mount (rAF), so the video unmounts async.
    await waitFor(() => {
      expect(screen.queryByTestId("tours-hero-video")).toBeNull();
    });
    expect(screen.queryByTestId("tours-hero-pause")).toBeNull();
  });

  it("missing clip falls back to solid type with no video", () => {
    installStubs(false);
    render(
      <ToursMaskedHero
        image={IMAGE}
        videoSrc={null}
        tourCount={20}
        regionCount={3}
        minDays={1}
        maxDays={12}
      />,
    );
    expect(screen.queryByTestId("tours-hero-video")).toBeNull();
    expect(
      screen.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeInTheDocument();
  });
});
