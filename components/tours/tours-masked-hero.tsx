"use client";

import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCalmExperience } from "@/components/motion/use-calm";
import type { ShowcaseImage } from "@/components/tours/showcase";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

const LINES = ["Journeys across", "Kenya and Tanzania."] as const;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Masked Heading hero for /tours.
 *
 * The headline is the mask: each line rises out of an overflow-hidden
 * mask while the savannah photograph is clipped inside the letterforms
 * themselves. Calm connections, reduced motion or a missing photograph
 * fall back to solid ivory type, and the scrim behind keeps the fill
 * readable. Real text stays in the DOM throughout.
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
  const range =
    minDays !== null && maxDays !== null
      ? minDays === maxDays
        ? `${minDays} day${minDays === 1 ? "" : "s"}`
        : `${minDays} to ${maxDays} days`
      : null;

  const heading = (
    <h1 className="type-mega max-w-5xl text-balance">
      {LINES.map((line, index) => (
        <span key={line} className="block overflow-hidden pb-[0.06em]">
          <MaskedLine
            text={line}
            index={index}
            calm={calm}
            image={image}
            accent={index === 1}
          />
        </span>
      ))}
    </h1>
  );

  return (
    <section
      aria-label="Safari tours"
      className="focus-ring-light relative overflow-hidden bg-night text-ivory"
    >
      {image ? (
        <>
          <div className="absolute inset-0" aria-hidden="true">
            <Image
              src={image.src}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectPosition: image.focal }}
              className={cn("object-cover", !calm && "ken-burns")}
            />
          </div>
          <div
            className="absolute inset-0"
            style={{ background: "var(--scrim)" }}
            aria-hidden="true"
          />
        </>
      ) : null}

      <Container className="relative pt-10 pb-16 sm:pt-14 sm:pb-24">
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

        <p className="type-eyebrow mt-10 text-sand sm:mt-14">
          Safaris · Kenya and Tanzania
        </p>
        <div className="mt-4">{heading}</div>
        <p className="type-body mt-6 max-w-2xl text-ivory/80">
          Real itineraries with day by day plans, inclusions and exclusions.
          Pricing is quoted per trip, nothing here is invented.
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
              <dd className="text-lg font-semibold text-ivory">{range}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
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
    </section>
  );
}

function MaskedLine({
  text,
  index,
  calm,
  image,
  accent,
}: {
  text: string;
  index: number;
  calm: boolean;
  image: ShowcaseImage | null;
  accent: boolean;
}) {
  // Photo-filled letterforms. The scrim behind the copy keeps the fill
  // readable; a soft drop shadow lifts the strokes off the background.
  const masked = !calm && image !== null;
  if (!masked) {
    return (
      <span className={cn(accent && "text-sand italic")}>{text}</span>
    );
  }
  return (
    <>
      <m.span
        className={cn("block will-change-transform", accent && "italic")}
        style={{
          backgroundImage: `url(${image.src})`,
          backgroundSize: "cover",
          backgroundPosition: image.focal,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 2px 18px rgb(14 13 11 / 0.45))",
        }}
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: EASE }}
      >
        {text}
      </m.span>
    </>
  );
}
