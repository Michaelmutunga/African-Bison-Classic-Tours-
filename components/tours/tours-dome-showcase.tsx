"use client";

import { useMemo } from "react";
import { DomeGallery, type DomePoolEntry } from "@/components/tours/dome-gallery";
import type { ShowcaseTour } from "@/components/tours/showcase";
import { Container } from "@/components/ui/layout";

/**
 * Safari dome for /tours.
 *
 * The active region's journeys laid out on a draggable sphere. Selecting
 * a tile enlarges it into a preview with a link to its day by day
 * itinerary. Tours without processed photography are skipped so no tile
 * ever renders empty; every journey remains in the index list below.
 */
export function ToursDomeShowcase({
  tours,
  activeLabel,
}: {
  tours: ShowcaseTour[];
  activeLabel: string;
}) {
  const pool: DomePoolEntry[] = useMemo(
    () =>
      tours
        .filter((tour) => tour.image !== null)
        .map((tour) => ({
          src: tour.image?.src ?? "",
          alt: tour.image?.alt ?? `${tour.title} — photo pending`,
          slug: tour.slug,
          title: tour.title,
          days: tour.durationDays,
          categoryLabel: tour.categoryLabel,
        })),
    [tours],
  );

  if (pool.length === 0) return null;

  return (
    <section
      id="dome"
      aria-label={`Safari dome, ${activeLabel}`}
      className="scroll-mt-24 bg-night text-ivory"
    >
      <Container className="focus-ring-light pt-14 sm:pt-20">
        <div className="max-w-2xl">
          <p className="type-label text-sand">The dome</p>
          <h2 className="type-h2 mt-2 text-balance text-ivory">
            Step inside {activeLabel.toLowerCase()}
          </h2>
          <p className="type-body mt-3 text-ivory/75">
            {pool.length} journeys on the sphere. Drag sideways to spin it,
            open a tile for the route summary, and follow the link for the
            full day by day plan.
          </p>
        </div>
      </Container>
      <div className="h-[68vh] max-h-[44rem] min-h-[26rem] w-full">
        <DomeGallery
          key={activeLabel}
          images={pool}
          segments={21}
          minRadius={320}
          maxRadius={1100}
          overlayBlurColor="#0e0d0b"
          imageBorderRadius="2px"
          openedImageBorderRadius="2px"
          grayscale={false}
        />
      </div>
    </section>
  );
}
