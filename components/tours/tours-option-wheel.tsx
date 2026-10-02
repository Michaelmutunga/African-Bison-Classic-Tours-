"use client";

import { useCallback } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";
import {
  ALL_SLUG,
  clampWheelIndex,
  wheelIndexForSlug,
  wheelOptionAngle,
  wheelPointPosition,
  wheelRingRotation,
  type ShowcaseCategory,
} from "@/components/tours/showcase";
import { Container, SectionHeading } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

const RADIUS = 36;

function shortLabel(slug: string, label: string): string {
  if (slug === ALL_SLUG) return "All";
  if (slug === "kenya") return "Kenya";
  if (slug === "tanzania") return "Tanzania";
  if (slug === "kenya-tanzania") return "KE + TZ";
  if (slug === "nairobi-day") return "Nairobi";
  return label.split(" ")[0] ?? label;
}

/**
 * Option Wheel for /tours.
 *
 * Safari types sit on a rotating dial; the active option rises to the top
 * and the hub names it. A legend list beside the dial mirrors every
 * option with honest counts, so the choice never depends on the dial
 * alone. Arrow keys move through options; the group is a radiogroup.
 */
export function ToursOptionWheel({
  options,
  active,
  onSelect,
  activeCount,
  activeLabel,
  rangeText,
}: {
  options: ShowcaseCategory[];
  active: string;
  onSelect: (slug: string) => void;
  activeCount: number;
  activeLabel: string;
  rangeText: string | null;
}) {
  const reduced = usePrefersReducedMotion();
  const total = options.length;
  const slugs = options.map((option) => option.slug);
  const activeIndex = wheelIndexForSlug(slugs, active);
  const rotation = wheelRingRotation(activeIndex, total);

  const select = useCallback(
    (index: number) => {
      const next = options[clampWheelIndex(index, total)];
      if (next && next.slug !== active) onSelect(next.slug);
    },
    [options, total, active, onSelect],
  );

  const onDialKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      select(activeIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      select(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0);
    } else if (event.key === "End") {
      event.preventDefault();
      select(total - 1);
    }
  };

  return (
    <section id="choose" aria-label="Choose your safari" className="scroll-mt-24 bg-ivory">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Choose your safari"
          title="Turn the wheel to your region"
          lede="Kenya, Tanzania, both countries together, or a Nairobi day. The journeys below follow your choice."
        />
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          {/* Dial */}
          <div
            role="radiogroup"
            aria-label="Filter safaris by region"
            onKeyDown={onDialKeyDown}
            className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[400px]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-ink/15"
            />
            <div
              aria-hidden="true"
              className="absolute inset-9 rounded-full border border-dashed border-ink/15 sm:inset-11"
            />
            {/* Fine-line ticks around the rim; positioned by the same
                geometry as the options so they scale with the dial. */}
            <div aria-hidden="true" className="absolute inset-0">
              {Array.from({ length: 36 }, (_, i) => {
                const { left, top } = wheelPointPosition(i * 10, 49);
                return (
                  <span
                    key={i}
                    className={cn(
                      "absolute h-1 w-px -translate-x-1/2 -translate-y-1/2 bg-ink/20",
                      i % 9 === 0 && "h-2.5 bg-ink/40",
                    )}
                    style={{ left: `${left}%`, top: `${top}%` }}
                  />
                );
              })}
            </div>

            {options.map((option, index) => {
              const angle = wheelOptionAngle(index, total) + rotation;
              const { left, top } = wheelPointPosition(angle, RADIUS);
              const isActive = option.slug === active;
              return (
                <button
                  key={option.slug}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`${option.label}, ${option.count} ${option.count === 1 ? "safari" : "safaris"}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onSelect(option.slug)}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className={cn(
                    "absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-center rounded-full border text-center",
                    !reduced &&
                      "transition-[left,top,background-color,color,scale] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isActive
                      ? "scale-110 border-ink bg-ink text-ivory"
                      : "border-ink/25 bg-ivory text-ink hover:border-ink",
                  )}
                >
                  <span className="type-numeric text-lg leading-none font-semibold">
                    {option.count}
                  </span>
                  <span className="type-caption mt-1 max-w-[4.5rem] leading-tight font-medium">
                    {shortLabel(option.slug, option.label)}
                  </span>
                </button>
              );
            })}

            {/* Hub */}
            <div className="absolute top-1/2 left-1/2 w-40 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="type-label text-clay-deep">Now showing</p>
              <p className="type-h3 mt-1 text-balance">{activeLabel}</p>
              <p className="type-numeric type-caption mt-1 text-ink/60">
                {activeCount} {activeCount === 1 ? "safari" : "safaris"}
                {rangeText ? ` · ${rangeText}` : ""}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => select(activeIndex - 1)}
                  aria-label="Previous region"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center border border-ink/25 text-lg hover:border-ink"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => select(activeIndex + 1)}
                  aria-label="Next region"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center border border-ink/25 text-lg hover:border-ink"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Legend + detail */}
          <div>
            <h3 className="type-label text-ink/60">Regions</h3>
            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
              {options.map((option) => {
                const isActive = option.slug === active;
                return (
                  <li key={option.slug}>
                    <button
                      type="button"
                      onClick={() => onSelect(option.slug)}
                      aria-pressed={isActive}
                      className={cn(
                        "flex w-full cursor-pointer items-baseline justify-between gap-4 px-4 py-3.5 text-left",
                        isActive ? "bg-night text-ivory" : "hover:bg-sand/40",
                      )}
                    >
                      <span className="type-h3">{option.label}</span>
                      <span
                        className={cn(
                          "type-small shrink-0",
                          isActive ? "text-ivory/75" : "text-ink/60",
                        )}
                      >
                        <span className="type-numeric">{option.count}</span>{" "}
                        {option.count === 1 ? "safari" : "safaris"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="type-small mt-4 text-ink/70" aria-live="polite">
              Showing {activeCount}{" "}
              {activeCount === 1 ? "safari" : "safaris"} in {activeLabel}
              {rangeText ? `, ${rangeText}` : ""}. Every journey below is
              private and tailor-made.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
