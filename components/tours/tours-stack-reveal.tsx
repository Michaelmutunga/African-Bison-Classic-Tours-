"use client";

import { useEffect, useRef, useState } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";
import Link from "next/link";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";
import { SafariImage } from "@/components/safari-image";
import {
  bringStackToFront,
  identityStackOrder,
  rotateStackBackward,
  rotateStackForward,
  type ShowcaseTour,
} from "@/components/tours/showcase";
import { Container, SectionHeading } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

const DECK_SIZE = 5;
const DROP_MS = 380;
const EASE = [0.16, 1, 0.3, 1] as const;

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Stack Reveal for /tours.
 *
 * A 3D deck of the active region's journeys. Pressing Next (or dragging
 * the front card down) drops the front card away; the deck promotes
 * behind it, and the dropped card returns at the back. Cards past the
 * third are parked invisibly to keep the paint cheap. Only the front
 * card is interactive; every journey also appears in the index list
 * below, so nothing is reachable only through the deck.
 */
export function ToursStackReveal({
  tours,
  activeLabel,
}: {
  tours: ShowcaseTour[];
  activeLabel: string;
}) {
  const reduced = usePrefersReducedMotion();
  const deck = tours.slice(0, DECK_SIZE);
  const [order, setOrder] = useState<number[]>(() => identityStackOrder(deck.length));
  const [dropping, setDropping] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  if (deck.length === 0) return null;

  const frontDeckIndex = order[0] ?? 0;
  const busy = dropping !== null;

  const next = () => {
    if (busy || deck.length < 2) return;
    if (reduced) {
      setOrder((prev) => rotateStackForward(prev));
      return;
    }
    setDropping(order[0] ?? 0);
    timer.current = window.setTimeout(() => {
      setOrder((prev) => rotateStackForward(prev));
      setDropping(null);
    }, DROP_MS);
  };

  const prev = () => {
    if (busy || deck.length < 2) return;
    setOrder((current) => rotateStackBackward(current));
  };

  const bringForward = (deckIndex: number) => {
    if (busy || deckIndex === frontDeckIndex) return;
    setOrder((current) => bringStackToFront(current, deckIndex));
  };

  const onDeckKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      prev();
    }
  };

  return (
    <section id="featured" aria-label="Featured journeys" className="scroll-mt-24 bg-sand/40">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Featured journeys"
          title={`Start with ${activeLabel.toLowerCase()}`}
          lede={`${deck.length} journeys to open first. Send the front card to the back to meet the next one; the full list follows below.`}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          {/* Deck */}
          <div onKeyDown={onDeckKeyDown}>
            <div
              className="relative mx-auto h-[560px] w-full max-w-[560px] sm:h-[600px]"
              style={{ perspective: "1200px" }}
            >
              <LazyMotion features={domAnimation}>
                {deck.map((tour, deckIndex) => {
                  const pos = order.indexOf(deckIndex);
                  const isFront = pos === 0;
                  const isDropping = dropping === deckIndex;
                  const parked = pos > 2;
                  return (
                    <m.div
                      key={tour.slug}
                      className={cn(
                        "absolute inset-0",
                        !isFront && "pointer-events-none",
                      )}
                      style={{ zIndex: deck.length - pos }}
                      aria-hidden={!isFront}
                      inert={!isFront}
                      initial={false}
                      drag={isFront && !reduced && !busy ? "y" : false}
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.5}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 90 || info.velocity.y > 500) next();
                      }}
                      animate={
                        isDropping
                          ? { y: 260, opacity: 0, rotate: -8, scale: 0.95, rotateX: 0 }
                          : parked
                            ? { y: 54, opacity: 0, rotate: 0, scale: 0.86, rotateX: 0 }
                            : {
                                y: pos * 18,
                                opacity: 1 - pos * 0.12,
                                rotate: pos === 0 ? 0 : pos % 2 === 0 ? -0.8 : 0.8,
                                scale: 1 - pos * 0.05,
                                rotateX: pos === 0 ? 0 : -4,
                              }
                      }
                      transition={
                        reduced
                          ? { duration: 0 }
                          : {
                              duration: isDropping ? 0.38 : 0.7,
                              ease: EASE,
                            }
                      }
                    >
                      <article className="flex h-full flex-col border border-ink/10 bg-ivory text-ink">
                        <SafariImage
                          seed={tour.slug}
                          label={tour.title}
                          alt={tour.image?.alt ?? `${tour.title} — photo pending`}
                          src={tour.image?.src}
                          focal={tour.image?.focal}
                          ratio="aspect-[16/8]"
                          priority={deckIndex === 0}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="flex flex-1 flex-col p-6 sm:p-8">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="type-numeric font-display text-4xl text-ink/25">
                              {pad(deckIndex + 1)}
                            </span>
                            <p className="type-label text-clay-deep">
                              {tour.categoryLabel} · {tour.durationDays} day
                              {tour.durationDays === 1 ? "" : "s"}
                            </p>
                          </div>
                          <h3 className="type-h2 mt-3 text-balance">
                            {isFront ? (
                              <Link
                                href={`/tours/${tour.slug}`}
                                className="hover:text-clay-deep"
                              >
                                {tour.title}
                              </Link>
                            ) : (
                              tour.title
                            )}
                          </h3>
                          <p className="type-small mt-3 line-clamp-3 text-ink/70">
                            {tour.excerpt}
                          </p>
                          <p className="mt-auto pt-5">
                            {isFront ? (
                              <Link
                                href={`/tours/${tour.slug}`}
                                aria-label={`View itinerary: ${tour.title}`}
                                className="type-small font-semibold underline underline-offset-4 hover:text-clay-deep"
                              >
                                View itinerary →
                              </Link>
                            ) : (
                              <span
                                aria-hidden="true"
                                className="type-small font-semibold text-ink/30 underline underline-offset-4"
                              >
                                View itinerary →
                              </span>
                            )}
                          </p>
                        </div>
                      </article>
                    </m.div>
                  );
                })}
              </LazyMotion>
            </div>

            {/* Controls */}
            {deck.length > 1 ? (
              <div className="mx-auto mt-6 flex max-w-[560px] items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={busy}
                    aria-label="Bring back card to front"
                    className="h-10 cursor-pointer border border-ink/25 px-4 text-lg hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={busy}
                    aria-label="Send front card to back"
                    className="h-10 cursor-pointer border border-ink bg-ink px-4 text-lg text-ivory hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
                <div className="flex items-center gap-2" role="group" aria-label="Choose journey">
                  {deck.map((tour, deckIndex) => (
                    <button
                      key={tour.slug}
                      type="button"
                      onClick={() => bringForward(deckIndex)}
                      aria-label={`Show ${tour.title}`}
                      aria-current={deckIndex === frontDeckIndex}
                      className={cn(
                        "h-1.5 cursor-pointer",
                        deckIndex === frontDeckIndex
                          ? "w-8 bg-ink"
                          : "w-4 bg-ink/25 hover:bg-ink/60",
                      )}
                    />
                  ))}
                </div>
                <p className="type-numeric type-small text-ink/60" aria-live="polite">
                  {pad(frontDeckIndex + 1)} / {pad(deck.length)}
                </p>
              </div>
            ) : null}
          </div>

          {/* Side note */}
          <div className="lg:pl-4">
            <h3 className="type-h3">How to read the deck</h3>
            <ol className="type-small mt-4 space-y-3 text-ink/75">
              <li>
                <strong className="font-semibold text-ink">01 · Front card.</strong>{" "}
                The journey on top, with its photograph, length and route
                summary.
              </li>
              <li>
                <strong className="font-semibold text-ink">02 · Send it back.</strong>{" "}
                Press Next or drag the card down. It drops away, the deck
                promotes, and the card returns at the back.
              </li>
              <li>
                <strong className="font-semibold text-ink">03 · Open one.</strong>{" "}
                Every card links to its day by day itinerary, inclusions and
                exclusions.
              </li>
            </ol>
            <p className="type-small mt-5 border-l-2 border-clay pl-4 text-ink/70">
              Wildlife sightings are never guaranteed. The itineraries say
              where you go and what is included; your guide reads the ground
              from there.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
