import Link from "next/link";
import Image from "next/image";
import type { PublicDestinationSummary } from "@/lib/catalog";
import type { ImageEntry } from "@/lib/imagery";
import { cn } from "@/lib/cn";

/**
 * One expedition-ledger row. The whole row is a single link to the
 * destination page. On large screens a photograph of the park unfolds at
 * the row's right end on hover or keyboard focus; touch screens get a
 * small inline thumbnail instead. Destinations without processed
 * photography get an honest monogram tile, never a borrowed photo.
 */
export function DestinationLedgerRow({
  destination,
  position,
  photo,
  safariCount,
  calm,
}: {
  destination: PublicDestinationSummary;
  position: number;
  photo: ImageEntry | null;
  safariCount: number;
  calm: boolean;
}) {
  const initial = destination.name.trim().charAt(0).toUpperCase() || "A";
  const countCopy =
    safariCount === 0
      ? "On request"
      : `${safariCount} ${safariCount === 1 ? "safari" : "safaris"}`;

  return (
    <li>
      <Link
        href={`/destinations/${destination.slug}`}
        aria-label={`${destination.name}, ${destination.country}, ${countCopy}`}
        className="group relative grid grid-cols-[auto_1fr] items-center gap-4 border-t border-sand py-7 last:border-b sm:grid-cols-[5rem_1fr_auto] sm:gap-6"
      >
        <span
          aria-hidden="true"
          className="font-display text-4xl text-ink/20 transition-colors duration-500 group-hover:text-clay-deep group-focus-visible:text-clay-deep sm:text-5xl"
        >
          {String(position).padStart(2, "0")}
        </span>

        {photo ? (
          <span
            aria-hidden="true"
            className="relative block h-20 w-20 overflow-hidden bg-night lg:hidden"
          >
            <Image
              src={photo.src}
              alt=""
              fill
              loading="lazy"
              sizes="80px"
              className="object-cover"
              style={{ objectPosition: photo.focal }}
            />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="font-display flex h-20 w-20 items-center justify-center bg-earth-deep text-3xl text-ivory lg:hidden"
          >
            {initial}
          </span>
        )}

        <span className="col-span-2 sm:col-span-1">
          <span className="type-label text-clay-deep">{destination.country}</span>
          <span className="font-display mt-1 block text-2xl leading-tight transition-colors group-hover:text-clay-deep group-focus-visible:text-clay-deep sm:text-3xl">
            {destination.name}
          </span>
          <span className="type-small mt-2 block max-w-2xl text-ink/70">
            {destination.excerpt}
          </span>
          {destination.highlights.length > 0 ? (
            <span className="type-caption mt-2 block text-ink/55">
              {destination.highlights.slice(0, 4).join(" · ")}
            </span>
          ) : null}
        </span>

        <span className="col-span-2 flex items-center gap-6 sm:col-span-1">
          <span className="flex flex-col items-start gap-1 sm:items-end">
            <span className="type-numeric type-small font-semibold whitespace-nowrap">
              {countCopy}
            </span>
            <span
              aria-hidden="true"
              className="text-clay-deep transition-transform duration-500 group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5"
            >
              →
            </span>
          </span>
          {photo && !calm ? (
            <span
              aria-hidden="true"
              data-testid="ledger-reveal"
              className={cn(
                "relative hidden h-28 shrink-0 overflow-hidden bg-night transition-all duration-500",
                "lg:block lg:w-0 lg:opacity-0",
                "lg:group-hover:w-52 lg:group-hover:opacity-100",
                "lg:group-focus-visible:w-52 lg:group-focus-visible:opacity-100",
              )}
            >
              <Image
                src={photo.src}
                alt=""
                fill
                loading="lazy"
                sizes="208px"
                className="object-cover"
                style={{ objectPosition: photo.focal }}
              />
              <span
                className="absolute inset-0"
                style={{ background: "var(--scrim)" }}
              />
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
