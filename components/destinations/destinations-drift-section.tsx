"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DriftWall } from "@/components/destinations/drift-wall";
import { useCalmExperience, useMounted } from "@/components/motion/use-calm";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";
import type { PublicDestinationSummary } from "@/lib/catalog";
import type { DriftWallItem } from "@/lib/destinations-wall";

type Region = "all" | "Kenya" | "Tanzania";

const REGIONS: Array<{ value: Region; label: string }> = [
  { value: "all", label: "All" },
  { value: "Kenya", label: "Kenya" },
  { value: "Tanzania", label: "Tanzania" },
];

/**
 * Cinematic destinations showcase. A drifting photo wall on night carries
 * the photographed parks, with a calm static grid for reduced motion,
 * data saver and slow connections. The numbered index below lists every
 * destination, including places still waiting on processed photography.
 */
export function DestinationsDriftSection({
  items,
  destinations,
}: {
  items: DriftWallItem[];
  destinations: PublicDestinationSummary[];
}) {
  const calm = useCalmExperience();
  const mounted = useMounted();
  const [region, setRegion] = useState<Region>("all");
  const [columns, setColumns] = useState(5);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setColumns(mq.matches ? 3 : 5);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const filteredItems = useMemo(
    () => (region === "all" ? items : items.filter((item) => item.subtitle === region)),
    [items, region],
  );
  const filteredDestinations = useMemo(
    () =>
      region === "all"
        ? destinations
        : destinations.filter((destination) => destination.country === region),
    [destinations, region],
  );

  return (
    <>
      <section
        aria-label="Destination wall"
        className="bg-night text-ivory"
        data-ready={mounted || undefined}
      >
        <Container className="pt-12 sm:pt-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="type-eyebrow text-sand">The ground we cover</p>
              <h2 className="type-h1 mt-3 text-balance">
                Sixteen corners of East Africa
              </h2>
              <p className="type-body mt-4 text-ivory/75">
                Parks, lakes, mountains and one remarkable city. Every tile
                below is a place our guides drive each week. Open any of them
                to see its safaris.
              </p>
            </div>
            <div
              role="group"
              aria-label="Filter destinations by country"
              className="focus-ring-light flex gap-2"
            >
              {REGIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={region === option.value}
                  onClick={() => setRegion(option.value)}
                  className={cn(
                    "type-label cursor-pointer rounded-[2px] border px-4 py-2 normal-case transition-colors",
                    region === option.value
                      ? "border-ivory bg-ivory text-night"
                      : "border-ivory/30 text-ivory/80 hover:border-ivory/70 hover:text-ivory",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Container>

        <div
          className="relative mt-8 h-[480px] sm:h-[600px]"
          data-testid="drift-wall-wrap"
        >
          {calm ? (
            <Container className="h-full overflow-y-auto pb-10">
              <div
                className="grid grid-cols-2 gap-4 sm:grid-cols-3"
                data-testid="drift-wall-still"
              >
                {filteredItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group relative block aspect-[3/2] overflow-hidden"
                    aria-label={`${item.title}, ${item.subtitle}`}
                  >
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      loading="lazy"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/85 to-transparent px-3 pt-8 pb-3"
                    >
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="type-label text-ivory/75">{item.subtitle}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Container>
          ) : (
            <DriftWall
              items={filteredItems}
              columns={columns}
              pauseOnHover
            />
          )}
        </div>
        <Container className="pb-12">
          <p className="type-small text-ivory/60">
            {calm
              ? "Choose any photograph to open its destination."
              : "Hover to pause a column. Choose any tile to open its destination."}
          </p>
        </Container>
      </section>

      <section aria-label="Destination index" className="bg-ivory">
        <Container className="py-14 sm:py-20">
          <p className="type-eyebrow text-clay-deep">Index</p>
          <h2 className="type-h2 mt-3">The full list</h2>
          <ol aria-label="Destination index" className="mt-8">
            {filteredDestinations.map((destination, index) => (
              <li
                key={destination.slug}
                className="grid gap-2 border-t border-sand py-6 last:border-b sm:grid-cols-[4rem_1fr] sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="type-numeric text-sm font-semibold text-clay-deep"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="type-label text-clay-deep">{destination.country}</p>
                  <h3 className="type-h3 mt-1">
                    <Link
                      href={`/destinations/${destination.slug}`}
                      className="hover:text-clay-deep"
                    >
                      {destination.name}
                    </Link>
                  </h3>
                  <p className="type-small mt-2 max-w-3xl text-ink/70">
                    {destination.excerpt}
                  </p>
                  {destination.highlights.length > 0 ? (
                    <p className="type-caption mt-2 text-ink/60">
                      {destination.highlights.slice(0, 4).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/builder" variant="accent">
              Design your safari
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Talk to a safari planner
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
