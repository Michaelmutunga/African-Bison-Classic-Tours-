"use client";

import { m, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useCalmExperience } from "@/components/motion/use-calm";
import type { ShowcaseImage } from "@/components/tours/showcase";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

const HERO_WORD = "JOURNEYS";
const HEADING_LABEL = "Journeys across Kenya and Tanzania.";
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Sticky-backdrop hero for /tours.
 *
 * The savannah photograph is pinned full-viewport while three beats of
 * copy scroll over it, so the image feels fixed and only the words move.
 * The headline drifts slightly faster than the scroll for depth; calm
 * connections and reduced motion get the same layout with no drift and
 * no Ken Burns zoom. One h1, full sentence kept as its accessible name.
 */
export function ToursMaskedHero({
  image,
  tourCount,
  regionCount,
  minDays,
  maxDays,
}: {
  image: ShowcaseImage | null;
  tourCount: number;
  regionCount: number;
  minDays: number | null;
  maxDays: number | null;
}) {
  const calm = useCalmExperience();
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  // Words glide past the pinned image; the backdrop itself never moves.
  const wordDrift = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const copyDrift = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const range =
    minDays !== null && maxDays !== null
      ? minDays === maxDays
        ? `${minDays} day${minDays === 1 ? "" : "s"}`
        : `${minDays} to ${maxDays} days`
      : null;

  return (
    <section
      ref={sectionRef}
      aria-label="Safari tours"
      data-testid="tours-hero"
      className="focus-ring-light relative bg-night text-ivory"
    >
      <div
        data-testid="tours-hero-backdrop"
        aria-hidden="true"
        className="sticky top-0 h-[100svh] overflow-hidden"
      >
        {image ? (
          <Image
            src={image.src}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectPosition: image.focal }}
            className="object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{ background: "var(--scrim)" }}
        />
      </div>

      <div className="relative z-10 -mt-[100svh]">
        <div className="flex min-h-[100svh] flex-col pt-10 pb-14 sm:pt-14">
          <Container>
            <nav aria-label="Breadcrumb">
              <ol className="type-caption flex items-center gap-2 text-ivory/70">
                <li>
                  <Link href="/" className="underline-offset-4 hover:underline">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ivory">
                  Safaris
                </li>
              </ol>
            </nav>
          </Container>
          <Container className="mt-auto">
            <m.div style={calm ? undefined : { y: wordDrift }}>
              <p className="type-eyebrow text-sand">
                Safaris · Kenya and Tanzania
              </p>
              <h1
                aria-label={HEADING_LABEL}
                className="type-mega mt-4 max-w-5xl"
              >
                <span
                  className="block overflow-hidden pb-[0.06em]"
                  aria-hidden="true"
                >
                  <m.span
                    className="block text-ivory will-change-transform"
                    style={{
                      filter:
                        "drop-shadow(0 2px 18px rgb(14 13 11 / 0.45))",
                    }}
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
                  >
                    {HERO_WORD}
                  </m.span>
                </span>
                <span className="sr-only">{HEADING_LABEL}</span>
              </h1>
            </m.div>
          </Container>
        </div>

        <div className="flex min-h-[85svh] items-center">
          <Container>
            <m.div style={calm ? undefined : { y: copyDrift }}>
              <p className="type-body max-w-2xl text-ivory/80">
                Real itineraries with day by day plans, inclusions and
                exclusions. Pricing is quoted per trip, nothing here is
                invented.
              </p>
              <dl className="type-small mt-8 flex flex-wrap gap-x-8 gap-y-3 text-ivory/80">
                <div className="flex items-baseline gap-2">
                  <dt className="type-label text-sand">Itineraries</dt>
                  <dd className="type-numeric text-lg font-semibold text-ivory">
                    {tourCount}
                  </dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="type-label text-sand">Regions</dt>
                  <dd className="type-numeric text-lg font-semibold text-ivory">
                    {regionCount}
                  </dd>
                </div>
                {range ? (
                  <div className="flex items-baseline gap-2">
                    <dt className="type-label text-sand">Lengths</dt>
                    <dd className="text-lg font-semibold text-ivory">
                      {range}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </m.div>
          </Container>
        </div>

        <div className="flex min-h-[85svh] items-center pb-24">
          <Container>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="#choose" variant="accent" size="lg">
                Choose your safari
              </ButtonLink>
              <ButtonLink
                href="#dome"
                size="lg"
                className="border border-ivory/30 text-ivory hover:border-ivory hover:bg-ivory/10"
              >
                Enter the dome
              </ButtonLink>
            </div>
          </Container>
        </div>
      </div>
    </section>
  );
}
