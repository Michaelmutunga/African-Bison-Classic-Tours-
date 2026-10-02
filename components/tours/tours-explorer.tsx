"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SafariImage } from "@/components/safari-image";
import {
  ALL_LABEL,
  ALL_SLUG,
  durationRange,
  filterShowcaseTours,
  type ShowcaseCategory,
  type ShowcaseTour,
} from "@/components/tours/showcase";
import { ToursDomeShowcase } from "@/components/tours/tours-dome-showcase";
import { ToursOptionWheel } from "@/components/tours/tours-option-wheel";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/layout";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Tours explorer for /tours.
 *
 * Owns the active wheel selection, filters the preloaded catalogue in
 * memory (no round trip per click), and mirrors the choice into the URL
 * so regions stay deep-linkable: /tours?category=kenya. The server
 * renders the same initial selection, so SSR and first paint agree.
 */
export function ToursExplorer({
  tours,
  categories,
  initialCategory,
}: {
  tours: ShowcaseTour[];
  categories: ShowcaseCategory[];
  initialCategory: string;
}) {
  const options = useMemo<ShowcaseCategory[]>(
    () => [
      { slug: ALL_SLUG, label: ALL_LABEL, count: tours.length },
      ...categories,
    ],
    [tours.length, categories],
  );
  const slugs = useMemo(() => options.map((option) => option.slug), [options]);
  const [active, setActive] = useState(
    slugs.includes(initialCategory) ? initialCategory : ALL_SLUG,
  );

  const filtered = useMemo(() => filterShowcaseTours(tours, active), [tours, active]);
  const range = useMemo(() => durationRange(filtered), [filtered]);
  const activeLabel =
    options.find((option) => option.slug === active)?.label ?? ALL_LABEL;
  const rangeText =
    range.min !== null && range.max !== null
      ? range.min === range.max
        ? `${range.min} day${range.min === 1 ? "" : "s"}`
        : `${range.min} to ${range.max} days`
      : null;

  const select = (slug: string) => {
    setActive(slug);
    if (typeof window !== "undefined") {
      const url = slug === ALL_SLUG ? "/tours" : `/tours?category=${slug}`;
      window.history.replaceState(null, "", url);
    }
  };

  return (
    <>
      <ToursOptionWheel
        options={options}
        active={active}
        onSelect={select}
        activeCount={filtered.length}
        activeLabel={activeLabel}
        rangeText={rangeText}
      />

      {filtered.length > 0 ? (
        <ToursDomeShowcase
          key={active}
          tours={filtered}
          activeLabel={activeLabel}
        />
      ) : null}

      <section aria-labelledby="tours-index-heading" className="bg-ivory">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Index"
            title={`All ${activeLabel.toLowerCase()}`}
            lede={`${filtered.length} ${filtered.length === 1 ? "itinerary" : "itineraries"}. Open any row for the day by day plan.`}
          />
          <h2 id="tours-index-heading" className="sr-only">
            All {activeLabel} ({filtered.length})
          </h2>
          {filtered.length > 0 ? (
            <ol className="mt-8 border-b border-ink/10">
              {filtered.map((tour, index) => (
                <li key={tour.slug} className="border-t border-ink/10">
                  <Link
                    href={`/tours/${tour.slug}`}
                    aria-label={`${tour.title}, ${tour.durationDays} days`}
                    className="group flex items-center gap-4 py-4 sm:gap-6 sm:py-5"
                  >
                    <span className="type-numeric type-small w-8 shrink-0 text-ink/40">
                      {pad(index + 1)}
                    </span>
                    <span className="hidden w-24 shrink-0 overflow-hidden sm:block">
                      <SafariImage
                        seed={tour.slug}
                        label={tour.title}
                        alt=""
                        src={tour.image?.src}
                        focal={tour.image?.focal}
                        ratio="aspect-[4/3]"
                        quiet
                        sizes="96px"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="type-h3 block text-balance group-hover:text-clay-deep">
                        {tour.title}
                      </span>
                      <span className="type-caption mt-1 block text-ink/60">
                        {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"} ·{" "}
                        {tour.categoryLabel} · Private and tailor-made
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xl transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="type-body mt-8 text-ink/70">
              No journeys in this region yet.{" "}
              <Link href="/contact" className="underline underline-offset-4">
                Ask us to design one
              </Link>
              .
            </p>
          )}
        </Container>
      </section>

      <section aria-label="Plan a custom safari" className="bg-night text-ivory">
        <Container className="py-14 text-center sm:py-20">
          <p className="type-label text-sand">Cannot see your trip</p>
          <h2 className="type-h2 mx-auto mt-2 max-w-2xl text-balance">
            Tell us the route you are dreaming of. We will design it.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/builder" variant="accent" size="lg">
              Design your safari
            </ButtonLink>
            <ButtonLink
              href="/contact"
              size="lg"
              className="border border-ivory/30 text-ivory hover:border-ivory hover:bg-ivory/10"
            >
              Talk to a planner
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
