"use client";

import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCalmExperience } from "@/components/motion/use-calm";
import type { ShowcaseImage } from "@/components/tours/showcase";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { VideoText } from "@/components/ui/video-text";
import { cn } from "@/lib/cn";

const VIDEO_WORD = "JOURNEYS";
const HEADING_LABEL = "Journeys across Kenya and Tanzania.";
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Video-text hero for /tours.
 *
 * The giant JOURNEYS word is the mask: safari footage plays inside the
 * letterforms while the still savannah photograph with the scrim keeps
 * the surrounding copy readable. Calm connections, reduced motion or a
 * missing clip fall back to solid ivory type. The full sentence stays
 * available as the h1 accessible name and sr-only text.
 */
export function ToursMaskedHero({
  image,
  videoSrc,
  tourCount,
  regionCount,
  minDays,
  maxDays,
}: {
  image: ShowcaseImage | null;
  videoSrc?: string | null;
  tourCount: number;
  regionCount: number;
  minDays: number | null;
  maxDays: number | null;
}) {
  const calm = useCalmExperience();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [paused, setPaused] = useState(false);
  const clip = videoSrc ?? null;
  const showVideo = !calm && clip !== null && image !== null;
  const range =
    minDays !== null && maxDays !== null
      ? minDays === maxDays
        ? `${minDays} day${minDays === 1 ? "" : "s"}`
        : `${minDays} to ${maxDays} days`
      : null;

  // React 19 drops the `muted` content attribute on <video>, so set it
  // imperatively. Autoplay policy needs it present.
  useEffect(() => {
    if (!showVideo) return;
    const video = videoRef.current;
    if (video && !video.hasAttribute("muted")) video.setAttribute("muted", "");
  }, [showVideo]);

  // Pause when offscreen or the tab hides; resume only when the visitor
  // never asked to pause.
  useEffect(() => {
    if (!showVideo) return;
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          void video.pause();
          return;
        }
        if (!paused) void video.play().catch(() => undefined);
      },
      { threshold: 0.15 },
    );
    observer.observe(section);
    const onHide = () => {
      if (document.hidden) void videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [showVideo, paused]);

  const heading = (
    <h1 aria-label={HEADING_LABEL} className="type-mega max-w-5xl">
      <span className="block overflow-hidden pb-[0.06em]" aria-hidden="true">
        {showVideo ? (
          <m.span
            className="block will-change-transform"
            style={{ filter: "drop-shadow(0 2px 18px rgb(14 13 11 / 0.45))" }}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          >
            <VideoText
              src={clip ?? ""}
              poster={image?.src}
              videoTestId="tours-hero-video"
              videoRef={videoRef}
              fontSize={17}
              className="h-[1.1em]"
            >
              {VIDEO_WORD}
            </VideoText>
          </m.span>
        ) : (
          <span className="block text-ivory">{VIDEO_WORD}</span>
        )}
      </span>
      <span className="sr-only">{HEADING_LABEL}</span>
    </h1>
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Safari tours"
      data-testid="tours-hero"
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
      {showVideo ? (
        <button
          type="button"
          data-testid="tours-hero-pause"
          aria-pressed={paused}
          aria-label={paused ? "Play background video" : "Pause background video"}
          onClick={() => {
            const video = videoRef.current;
            const next = !paused;
            setPaused(next);
            if (!video) return;
            if (next) void video.pause();
            else void video.play().catch(() => undefined);
          }}
          className="type-caption absolute right-5 bottom-5 z-10 border border-ivory/40 bg-night/60 px-3 py-2 text-ivory"
        >
          {paused ? "Play" : "Pause"}
        </button>
      ) : null}
    </section>
  );
}
