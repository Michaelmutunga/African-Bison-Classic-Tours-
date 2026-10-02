import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VideoText } from "@/components/ui/video-text";

function installStubs() {
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
}
installStubs();

describe("VideoText", () => {
  it("renders a self-hosted decorative video with an sr-only word", async () => {
    render(
      <VideoText
        src="/video/hero.mp4"
        poster="/images/hero/landing-savannah-sunset.jpg"
        videoTestId="tours-hero-video"
      >
        JOURNEYS
      </VideoText>,
    );
    const video = screen.getByTestId("tours-hero-video");
    expect(video).toHaveAttribute("src", "/video/hero.mp4");
    expect(video).toHaveAttribute(
      "poster",
      "/images/hero/landing-savannah-sunset.jpg",
    );
    expect(video).toHaveAttribute("muted");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).toHaveAttribute("aria-hidden", "true");
    // Screen-reader text keeps the word available without the footage.
    expect(screen.getByText("JOURNEYS", { selector: ".sr-only" })).toBeInTheDocument();
    // The SVG text mask settles after mount and names the word.
    await waitFor(() => {
      const mask = document.querySelector(
        '[style*="data:image/svg+xml"]',
      ) as HTMLElement | null;
      expect(mask).not.toBeNull();
      expect(mask?.style.maskImage ?? "").toContain("JOURNEYS");
    });
  });

  it("never points at a remote host (CSP media-src self)", () => {
    render(<VideoText src="/video/hero.mp4">JOURNEYS</VideoText>);
    const video = document.querySelector("video");
    expect(video?.getAttribute("src") ?? "").not.toMatch(/^https?:/);
  });
});
