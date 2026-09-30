"use client";

import { LazyMotion, domAnimation, m, useScroll, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ImageEntry } from "@/lib/imagery";
import { SplitChars } from "@/components/motion/split-chars";
import { useCalmExperience, useMounted } from "@/components/motion/use-calm";
import { hasPlayedIntro } from "@/components/motion/welcome-intro";

const EASE = [0.16, 1, 0.3, 1] as const;

function LayerImage({ image, priority }: { image: ImageEntry; priority?: boolean }) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      priority={priority}
      fetchPriority={priority ? "high" : "low"}
      sizes="100vw"
      style={{ objectPosition: image.focal }}
      className="object-cover"
    />
  );
}



export function DescentHero({
  sky,
  sunset,
  savannah,
  wildlife,
  destinationsCount,
}: {
  sky: ImageEntry;
  sunset: ImageEntry;
  savannah: ImageEntry;
  wildlife: ImageEntry;
  destinationsCount: number;
}) {
  const calm = useCalmExperience();
  const mounted = useMounted();
  const [shortViewport, setShortViewport] = useState(false);
  // Render-time session read only: no state is set, so server and first
  // client render always agree.
  const firstVisit = mounted && !hasPlayedIntro();
  const [active, setActive] = useState(1);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-height: 520px)");
    const frame = requestAnimationFrame(() => setShortViewport(media.matches));
    const onChange = (event: MediaQueryListEvent) => setShortViewport(event.matches);
    media.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", onChange);
    };
  }, []);

  const { scrollYProgress: p } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  // Active chapter from a native scroll listener (deterministic across
  // smooth-scroll providers); motion values keep driving the visuals.
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const total = el.offsetHeight - window.innerHeight;
      const value = total > 0 ? Math.min(Math.max(-el.getBoundingClientRect().top / total, 0), 1) : 1;
      setActive(value < 0.25 ? 1 : value < 0.55 ? 2 : value < 0.78 ? 3 : 4);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (calm || shortViewport) {
    return <StaticDescent sky={sky} sunset={sunset} savannah={savannah} wildlife={wildlife} destinationsCount={destinationsCount} />;
  }

  const charDelay = firstVisit ? 1.1 : 0;

  return (
    <section aria-label="Introduction">
      <div ref={targetRef} id="descent" className="relative h-[320vh] md:h-[420vh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden bg-night text-ivory">
          <SkyLayer p={p} image={sky} />
          <SunsetLayer p={p} image={sunset} />
          <SavannahLayer p={p} image={savannah} />
          <WildlifeLayer p={p} image={wildlife} />

          <a
            href="#journeys"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-24 focus:z-30 focus:bg-ivory focus:px-4 focus:py-2 focus:text-ink"
          >
            Skip to safaris
          </a>

          <Chapter visible={active === 1} labelled="Chapter 1">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-ivory/25 pb-3">
              <p className="type-eyebrow text-ivory/70">Private · Independent · Kenya and Tanzania</p>
              <p className="type-eyebrow text-ivory/70">01</p>
            </div>
            <p className="type-eyebrow text-sand">Your Africa. Your way.</p>
            <h1 aria-label="East African safaris, designed around you." className="type-mega mt-4 uppercase">
              <span className="block border-t border-ivory/25 pt-3 text-left">
                <SplitChars text="EAST AFRICAN" baseDelay={charDelay} />
              </span>
              <span className="block border-t border-ivory/25 pt-3 text-right">
                <SplitChars text="SAFARIS," baseDelay={charDelay + 0.15} />
              </span>
              <span className="block border-t border-ivory/25 pt-3 text-left">
                <SplitChars text="DESIGNED" baseDelay={charDelay + 0.3} />
              </span>
              <span className="block border-t border-ivory/25 pt-3 text-right text-clay">
                <SplitChars text="AROUND YOU." baseDelay={charDelay + 0.45} />
              </span>
            </h1>
            <p className="type-body mt-6 max-w-2xl text-ivory/80">
              Private Kenya and Tanzania journeys. Mara river crossings,
              Amboseli elephants beneath Kilimanjaro, the Serengeti plains.
              Planned with people who know the ground.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ChapterCta href="/builder" primary>
                Design your safari
              </ChapterCta>
              <ChapterCta href="/tours">Explore safaris</ChapterCta>
            </div>
            <div className="mt-10 flex items-center justify-between gap-4">
              <p className="type-eyebrow text-ivory/60">Follow the light</p>
              <p className="type-eyebrow text-ivory/60">Nairobi, Kenya</p>
            </div>
          </Chapter>

          <Chapter visible={active === 2} labelled="Chapter 2">
            <h2 aria-label="The light turns gold." className="type-mega uppercase">
              <span className="block text-left" aria-hidden="true">THE LIGHT</span>
              <span className="block text-right text-sand" aria-hidden="true">TURNS GOLD</span>
            </h2>
            <p className="type-body mt-6 max-w-xl text-ivory/80">
              Early drives, slow afternoons, long golden evenings.
            </p>
          </Chapter>

          <Chapter visible={active === 3} labelled="Chapter 3">
            <h2 aria-label="The plains open up." className="type-mega uppercase">
              <span className="block text-left" aria-hidden="true">THE PLAINS</span>
              <span className="block text-right text-sand" aria-hidden="true">OPEN UP</span>
            </h2>
            <p className="type-body mt-6 max-w-xl text-ivory/80">
              {destinationsCount} parks, reserves, lakes and mountains across
              Kenya and Tanzania.
            </p>
          </Chapter>

          <Chapter visible={active === 4} labelled="Chapter 4">
            <h2 aria-label="Wild, on its own time." className="type-mega uppercase">
              <span className="block text-left" aria-hidden="true">WILD, ON ITS</span>
              <span className="block text-right text-sand" aria-hidden="true">OWN TIME</span>
            </h2>
            <p className="type-body mt-6 max-w-xl text-ivory/80">
              Wildlife keeps its own schedule. We plan around the season and
              never promise a sighting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ChapterCta href="/builder" primary>
                Design your safari
              </ChapterCta>
              <ChapterCta href="/tours">Explore safaris</ChapterCta>
              <ChapterCta href="/contact">Talk to a planner</ChapterCta>
            </div>
          </Chapter>

          <Rail progress={p} active={active} />
        </div>
      </div>
    </section>
  );
}

function Chapter({
  visible,
  labelled,
  children,
}: {
  visible: boolean;
  labelled: string;
  children: React.ReactNode;
}) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        aria-label={labelled}
        aria-hidden={!visible}
        inert={!visible}
        className="absolute inset-0 z-20 flex flex-col justify-end px-5 pb-16 sm:px-10 md:justify-center md:pb-0"
        initial={false}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        style={{ pointerEvents: visible ? "auto" : "none" }}
      >
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </m.div>
    </LazyMotion>
  );
}

function ChapterCta({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "bg-clay px-6 py-3 text-sm font-semibold tracking-wide text-ivory uppercase transition-colors hover:bg-clay-deep"
          : "border border-ivory/40 px-6 py-3 text-sm font-semibold tracking-wide text-ivory uppercase transition-colors hover:border-ivory hover:bg-ivory/10"
      }
    >
      {children}
    </Link>
  );
}

function SkyLayer({ p, image }: { p: MotionValue<number>; image: ImageEntry }) {
  const y = useTransform(p, [0, 0.55], ["0%", "-22%"]);
  const scale = useTransform(p, [0, 0.55], [1.15, 1.02]);
  const opacity = useTransform(p, [0.38, 0.55], [1, 0]);
  const tint = useTransform(p, [0.3, 0.55], [0, 0.45]);
  return (
    <m.div aria-hidden="true" className="absolute -inset-[6%] z-0 will-change-transform" style={{ y, scale, opacity }}>
      <LayerImage image={image} priority />
      <m.div className="absolute inset-0 bg-night" style={{ opacity: tint }} />
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
    </m.div>
  );
}

function SunsetLayer({ p, image }: { p: MotionValue<number>; image: ImageEntry }) {
  const y = useTransform(p, [0.2, 0.55], ["100%", "0%"]);
  const scale = useTransform(p, [0.2, 0.55], [1.15, 1.05]);
  const opacity = useTransform(p, [0.62, 0.8], [1, 0]);
  const glowY = useTransform(p, [0.25, 0.6], ["0%", "38%"]);
  const glowOpacity = useTransform(p, [0.45, 0.62], [0.7, 0]);
  return (
    <m.div aria-hidden="true" className="absolute -inset-[6%] z-10 will-change-transform" style={{ y, scale, opacity }}>
      <LayerImage image={image} />
      <m.div
        className="absolute inset-x-0 top-1/3 h-2/3"
        style={{
          y: glowY,
          opacity: glowOpacity,
          background: "radial-gradient(60% 45% at 50% 60%, rgb(180 85 45 / 0.45), transparent 70%)",
        }}
      />
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
    </m.div>
  );
}

function SavannahLayer({ p, image }: { p: MotionValue<number>; image: ImageEntry }) {
  const y = useTransform(p, [0.5, 0.8], ["100%", "0%"]);
  const scale = useTransform(p, [0.5, 1], [1.15, 1.0]);
  return (
    <m.div aria-hidden="true" className="absolute -inset-[6%] z-10 will-change-transform" style={{ y, scale }}>
      <LayerImage image={image} />
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
    </m.div>
  );
}

function WildlifeLayer({ p, image }: { p: MotionValue<number>; image: ImageEntry }) {
  const opacity = useTransform(p, [0.75, 0.9], [0, 1]);
  const scale = useTransform(p, [0.75, 1], [1.12, 1.0]);
  return (
    <m.div aria-hidden="true" className="absolute -inset-[6%] z-10 will-change-transform" style={{ opacity, scale }}>
      <LayerImage image={image} />
      <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
    </m.div>
  );
}

function Rail({ progress, active }: { progress: MotionValue<number>; active: number }) {
  return (
    <div aria-hidden="true" className="absolute top-1/2 left-4 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex lg:left-8">
      {[1, 2, 3, 4].map((chapter) => (
        <span
          key={chapter}
          className={`type-caption tabular-nums ${chapter === active ? "text-sand" : "text-ivory/40"}`}
        >
          0{chapter}
        </span>
      ))}
      <span className="relative h-20 w-px bg-ivory/20">
        <m.span className="absolute inset-0 origin-top bg-sand" style={{ scaleY: progress }} />
      </span>
      <span className="sr-only">Chapter {active} of 4</span>
    </div>
  );
}

/** Static stack for reduced motion, data saving or short viewports. */
function StaticDescent({
  sky,
  sunset,
  savannah,
  wildlife,
  destinationsCount,
}: {
  sky: ImageEntry;
  sunset: ImageEntry;
  savannah: ImageEntry;
  wildlife: ImageEntry;
  destinationsCount: number;
}) {
  return (
    <section aria-label="Introduction">
      <div className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden bg-night px-5 pt-28 pb-14 text-ivory sm:px-10">
        <div className="absolute inset-0" aria-hidden="true">
          <LayerImage image={sky} priority />
          <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
        </div>
        <div className="relative mx-auto w-full max-w-6xl">
          <p className="type-eyebrow text-sand">Your Africa. Your way.</p>
          <h1 className="type-mega mt-4 uppercase">East African safaris, designed around you.</h1>
          <p className="type-body mt-6 max-w-2xl text-ivory/80">
            Private Kenya and Tanzania journeys. Mara river crossings,
            Amboseli elephants beneath Kilimanjaro, the Serengeti plains.
            Planned with people who know the ground.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ChapterCta href="/builder" primary>
              Design your safari
            </ChapterCta>
            <ChapterCta href="/tours">Explore safaris</ChapterCta>
          </div>
        </div>
      </div>
      <StaticBand
        image={sunset}
        heading="The light turns gold."
        caption="Early drives, slow afternoons, long golden evenings."
      />
      <StaticBand
        image={savannah}
        heading="The plains open up."
        caption={`${destinationsCount} parks, reserves, lakes and mountains across Kenya and Tanzania.`}
      />
      <StaticBand
        image={wildlife}
        heading="Wild, on its own time."
        caption="Wildlife keeps its own schedule. We plan around the season and never promise a sighting."
        ctas
      />
    </section>
  );
}

function StaticBand({
  image,
  heading,
  caption,
  ctas,
}: {
  image: ImageEntry;
  heading: string;
  caption: string;
  ctas?: boolean;
}) {
  return (
    <div className="relative overflow-hidden bg-night px-5 py-20 text-ivory sm:px-10">
      <div className="absolute inset-0" aria-hidden="true">
        <LayerImage image={image} />
        <div className="absolute inset-0" style={{ background: "var(--scrim)" }} />
      </div>
      <div className="relative mx-auto w-full max-w-6xl">
        <h2 className="type-h1 uppercase">{heading}</h2>
        <p className="type-body mt-4 max-w-xl text-ivory/80">{caption}</p>
        {ctas ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <ChapterCta href="/builder" primary>
              Design your safari
            </ChapterCta>
            <ChapterCta href="/tours">Explore safaris</ChapterCta>
            <ChapterCta href="/contact">Talk to a planner</ChapterCta>
          </div>
        ) : null}
      </div>
    </div>
  );
}
