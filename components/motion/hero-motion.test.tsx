import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiaReveal } from "@/components/motion/dia-reveal";
import { HyperText } from "@/components/motion/hyper-text";
import { MagneticCta } from "@/components/motion/magnetic-button";
import { SpinningText } from "@/components/motion/spinning-text";

// This jsdom setup has no browser APIs yet: stub the two that motion
// primitives and the calm hooks touch. Content renders regardless of
// animation state, so assertions stay meaningful.
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

describe("DiaReveal", () => {
  it("announces the full headline while showing every line", () => {
    render(
      <h1 aria-label="East African safaris, designed around you.">
        <DiaReveal
          lines={["East African", "Safaris,", { text: "Around you.", className: "text-sand" }]}
        />
      </h1>,
    );
    expect(
      screen.getByLabelText("East African safaris, designed around you."),
    ).toBeInTheDocument();
    expect(screen.getByText("East African")).toBeInTheDocument();
    expect(screen.getByText("Around you.")).toBeInTheDocument();
  });
});

describe("HyperText", () => {
  it("renders the final text and resolves after a scramble", async () => {
    render(<HyperText text="Design your safari" />);
    const label = screen.getByText("Design your safari");
    expect(label).toBeInTheDocument();
    fireEvent.mouseEnter(label);
    await waitFor(() => expect(screen.getByText("Design your safari")).toBeInTheDocument());
  });
});

describe("MagneticCta", () => {
  it("renders an accessible link both CTAs can reuse", () => {
    render(
      <MagneticCta href="/builder" primary label="Design your safari">
        <HyperText text="Design your safari" />
      </MagneticCta>,
    );
    const link = screen.getByRole("link", { name: "Design your safari" });
    expect(link).toHaveAttribute("href", "/builder");
  });
});

describe("SpinningText", () => {
  it("links to the journeys with an accessible name", () => {
    render(
      <SpinningText
        href="#journeys"
        label="Scroll to signature journeys"
        text="Private safaris · Kenya · Tanzania · "
      />,
    );
    expect(
      screen.getByRole("link", { name: "Scroll to signature journeys" }),
    ).toHaveAttribute("href", "#journeys");
  });
});
