"use client";

import Image from "next/image";
import { DiaReveal } from "@/components/motion/dia-reveal";
import { HyperText } from "@/components/motion/hyper-text";
import { MagneticCta } from "@/components/motion/magnetic-button";
import { SpinningText } from "@/components/motion/spinning-text";
import { useMounted } from "@/components/motion/use-calm";
import { hasPlayedIntro } from "@/components/motion/welcome-intro";
import type { ImageEntry } from "@/lib/imagery";

/**
 * Cinematic single-frame hero built on the client landing-page
 * composite (giraffes, zebras and wildebeest on golden savannah at
 * sunset), cropped to landscape with a dedicated mobile crop. A
 * bottom-weighted scrim keeps every word readable; the headline uses a
 * diagonal masked reveal, both CTAs are magnetic hover buttons with
 * hyper-text scramble labels, and a spinning badge marks the scroll cue.
 * Reduced motion, data saver and 2g/3g readers get the same layout as a
 * still composition — every motion primitive degrades internally.
 */
export function DescentHero({
  image,
  mobileImage,
}: {
  image: ImageEntry;
  mobileImage: ImageEntry;
}) {
  const mounted = useMounted();
  // Render-time session read only: no state is set, so server and first
  // client render always agree.
  const firstVisit = mounted && !hasPlayedIntro();
  const headlineDelay = firstVisit ? 1.0 : 0.15;

  return (
    <section aria-label="Introduction">
      <div id="descent" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-night text-ivory">
        <div className="ken-burns absolute inset-0" aria-hidden="true">
          <picture className="absolute inset-0 block">
            <source media="(max-width: 639px)" srcSet={mobileImage.src} />
            <Image
              src={image.src}
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              style={{ objectPosition: image.focal }}
              className="object-cover"
            />
          </picture>
          {/* Scrim gradient on photography only: strong at the top for the
              header and heaviest at the bottom where the words sit. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgb(14 13 11 / 0.62) 0%, rgb(14 13 11 / 0.18) 30%, rgb(14 13 11 / 0.08) 48%, rgb(14 13 11 / 0.42) 68%, rgb(14 13 11 / 0.82) 100%)",
            }}
          />
        </div>

        <a
          href="#journeys"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-24 focus:z-30 focus:bg-ivory focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to safaris
        </a>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pt-32 pb-10 sm:px-10 sm:pb-14">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-ivory/25 pb-3">
            <p className="type-eyebrow text-ivory/75">Private · Independent · Kenya and Tanzania</p>
            <p className="type-eyebrow text-ivory/75">01</p>
          </div>
          <p className="type-eyebrow text-sand">Your Africa. Your way.</p>
          <h1 aria-label="East African safaris, designed around you." className="type-mega mt-4 uppercase [text-shadow:0_2px_28px_rgb(0_0_0/0.6)]">
            <DiaReveal
              delay={headlineDelay}
              lines={[
                "East African",
                "Safaris,",
                "Designed",
                { text: "Around you.", className: "text-sand" },
              ]}
            />
          </h1>
          <p className="type-body mt-6 max-w-2xl text-ivory/85 [text-shadow:0_1px_16px_rgb(0_0_0/0.6)]">
            Private Kenya and Tanzania journeys. Mara river crossings,
            Amboseli elephants beneath Kilimanjaro, the Serengeti plains.
            Planned with people who know the ground.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <MagneticCta href="/builder" primary label="Design your safari">
              <HyperText text="Design your safari" />
              <span aria-hidden="true">→</span>
            </MagneticCta>
            <MagneticCta href="/tours" label="Explore safaris">
              <HyperText text="Explore safaris" />
              <span aria-hidden="true">→</span>
            </MagneticCta>
          </div>
          <div className="mt-10 flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="block h-10 w-px bg-ivory/40" />
              <p className="type-eyebrow text-ivory/65">
                Scroll
                <span className="mt-1 block text-ivory/45">Nairobi, Kenya</span>
              </p>
            </div>
            <SpinningText
              href="#journeys"
              label="Scroll to signature journeys"
              text="Private safaris · Kenya · Tanzania · "
              className="hidden sm:block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
