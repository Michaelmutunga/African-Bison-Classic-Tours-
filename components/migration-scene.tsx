"use client";

import { LazyMotion, domAnimation, m, useInView, useMotionValueEvent, useScroll } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ImageEntry } from "@/lib/imagery";
import { useCalmExperience } from "@/components/motion/use-calm";

/**
 * Full-bleed migration scene. The self-hosted video is the background
 * (muted, looping, pausable); the existing migration copy and honesty
 * note crossfade over it as the reader scrolls. Reduced motion and
 * data saving get the still image with a normal stacked layout.
 */
export function MigrationScene({
  poster,
  videoSrc,
}: {
  poster: ImageEntry;
  videoSrc: string;
}) {
  const calm = useCalmExperience();
  const targetRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [caption, setCaption] = useState(0);
  const inView = useInView(targetRef, { margin: "-10% 0px" });

  const { scrollYProgress: p } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  useMotionValueEvent(p, "change", (value) => {
    setCaption(value < 0.4 ? 0 : value < 0.7 ? 1 : 2);
  });

  // Pause when offscreen or the tab hides; resume only when the visitor
  // never asked to pause.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!inView || document.hidden) {
      void video.pause();
      return;
    }
    if (!paused) void video.play().catch(() => undefined);
  }, [inView, paused]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) void videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  if (calm) {
    return (
      <section aria-label="The great migration" className="bg-earth-deep text-ivory" data-testid="migration-scene">
        <div className="relative overflow-hidden">
          <Image
            src={poster.src}
            alt={poster.alt}
            width={poster.width}
            height={poster.height}
            sizes="100vw"
            style={{ objectPosition: poster.focal }}
            className="h-[52svh] w-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "var(--scrim)" }} aria-hidden="true" />
        </div>
        <MigrationCopy />
      </section>
    );
  }

  return (
    <section aria-label="The great migration" data-testid="migration-scene">
      <div ref={targetRef} className="relative h-[260vh] bg-night">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <video
            ref={videoRef}
            data-testid="migration-video"
            className="absolute inset-0 h-full w-full object-cover"
            src={videoSrc}
            poster={poster.src}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="absolute inset-0" style={{ background: "var(--scrim)" }} aria-hidden="true" />
          <LazyMotion features={domAnimation}>
            <CaptionBlock index={0} caption={caption}>
              <p className="type-label text-sand">The great migration</p>
              <h2 className="type-h2 mt-2 max-w-3xl text-balance" data-testid="migration-caption">
                Two million wildebeest between the Serengeti and the Mara,
                typically crossing the Mara River from July to October.
              </h2>
            </CaptionBlock>
            <CaptionBlock index={1} caption={caption}>
              <p className="type-label text-sand">The great migration</p>
              <p className="type-h2 mt-2 max-w-3xl text-balance" data-testid="migration-caption">
                River crossings are a highlight of the migration season, but
                wildlife moves on its own schedule. We plan around the
                season, never promise a crossing.
              </p>
            </CaptionBlock>
            <CaptionBlock index={2} caption={caption}>
              <p className="type-label text-sand">The great migration</p>
              <p className="type-body mt-2 max-w-2xl text-ivory/80" data-testid="migration-caption">
                Travel in season, stay near the river, give it days instead
                of hours. That is how crossings happen.
              </p>
              <p className="mt-6">
                <Link
                  href="/tours?category=kenya-tanzania"
                  className="inline-block bg-clay px-6 py-3 text-sm font-semibold tracking-wide text-ivory uppercase transition-colors hover:bg-clay-deep"
                >
                  Migration-season safaris
                </Link>
              </p>
            </CaptionBlock>
          </LazyMotion>
          <button
            type="button"
            data-testid="migration-pause"
            aria-pressed={paused}
            aria-label={paused ? "Play background video" : "Pause background video"}
            onClick={() => setPaused((value) => !value)}
            className="type-caption absolute right-5 bottom-5 z-10 border border-ivory/40 bg-night/60 px-3 py-2 text-ivory backdrop-blur-none"
          >
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      </div>
    </section>
  );
}

function CaptionBlock({
  index,
  caption,
  children,
}: {
  index: number;
  caption: number;
  children: React.ReactNode;
}) {
  const visible = caption === index;
  return (
    <m.div
      aria-hidden={!visible}
      inert={!visible}
      className="absolute inset-0 flex items-center px-5 sm:px-10"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </m.div>
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
