"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ImageEntry } from "@/lib/imagery";
import { useCalmExperience } from "@/components/motion/use-calm";

/**
 * Full-bleed migration scene. The self-hosted video plays on its own —
 * no words layered over it — with a pause control; the migration copy
 * and honesty note sit below the frame on solid ground. Reduced motion
 * and data saving get the still image with the same stacked layout.
 */
export function MigrationScene({
  poster,
  videoSrc,
}: {
  poster: ImageEntry;
  videoSrc: string;
}) {
  const calm = useCalmExperience();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Defer the ~9MB self-hosted clip until the frame nears the viewport so
  // initial navigation never pays for it. Poster shows meanwhile.
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (calm || videoReady) return;
    const frame = frameRef.current;
    if (!frame) return;
    if (typeof IntersectionObserver === "undefined") {
      const fallback = window.setTimeout(() => setVideoReady(true), 0);
      return () => window.clearTimeout(fallback);
    }
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVideoReady(true);
          preload.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    preload.observe(frame);
    return () => preload.disconnect();
  }, [calm, videoReady]);

  // React 19 drops the `muted` content attribute on <video> (verified:
  // neither `muted` nor `defaultMuted` survives to the DOM), so set it
  // imperatively. Autoplay policy and the e2e contract need it present.
  useEffect(() => {
    if (calm || !videoReady) return;
    const video = videoRef.current;
    if (video && !video.hasAttribute("muted")) video.setAttribute("muted", "");
  }, [calm, videoReady]);

  // Pause when offscreen or the tab hides; resume only when the visitor
  // never asked to pause.
  useEffect(() => {
    if (calm || !videoReady) return;
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame) return;
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
    observer.observe(frame);
    const onHide = () => {
      if (document.hidden) void videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [calm, paused, videoReady]);

  return (
    <section aria-label="The great migration" className="bg-earth-deep text-ivory" data-testid="migration-scene">
      <div ref={frameRef} className="relative overflow-hidden bg-night">
        {calm ? (
          <Image
            src={poster.src}
            alt={poster.alt}
            width={poster.width}
            height={poster.height}
            sizes="100vw"
            loading="lazy"
            decoding="async"
            style={{ objectPosition: poster.focal }}
            className="h-[52svh] w-full object-cover"
          />
        ) : videoReady ? (
          <video
            ref={videoRef}
            data-testid="migration-video"
            className="h-[72svh] w-full object-cover sm:h-[88svh]"
            src={videoSrc}
            poster={poster.src}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-label="Aerial footage of wildebeest crossing a river at sunset"
          />
        ) : (
          <Image
            src={poster.src}
            alt={poster.alt}
            width={poster.width}
            height={poster.height}
            sizes="100vw"
            loading="lazy"
            decoding="async"
            style={{ objectPosition: poster.focal }}
            className="h-[72svh] w-full object-cover sm:h-[88svh]"
          />
        )}
        {!calm ? (
          <button
            type="button"
            data-testid="migration-pause"
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
      </div>
      <MigrationCopy />
    </section>
  );
}

function MigrationCopy() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <p className="type-label text-sand">The great migration</p>
      <h2 className="type-h2 mt-2 max-w-3xl text-balance">
        Two million wildebeest between the Serengeti and the Mara, typically
        crossing the Mara River from July to October.
      </h2>
      <p className="type-body mt-4 max-w-2xl text-ivory/80">
        River crossings are a highlight of the migration season, but
        wildlife moves on its own schedule. We plan around the season, never
        promise a crossing.
      </p>
      <p className="mt-6">
        <Link
          href="/tours?category=kenya-tanzania"
          className="inline-block bg-clay px-6 py-3 text-sm font-semibold tracking-wide text-ivory uppercase transition-colors hover:bg-clay-deep"
        >
          Migration-season safaris
        </Link>
      </p>
    </div>
  );
}
