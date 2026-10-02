import Image from "next/image";
import Link from "next/link";
import type { InspirationCard } from "@/lib/dashboard";

/**
 * Real catalogue journeys for the traveller to dream on. Images come from
 * the client-photo registry; nothing here invents a price or a sighting.
 */
export function InspirationRow({
  tours,
  query,
}: {
  tours: InspirationCard[];
  query: string;
}) {
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tours.filter((tour) => tour.title.toLowerCase().includes(needle))
    : tours;
  if (visible.length === 0) return null;

  return (
    <section aria-label="Journeys to consider" className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="type-h3">Journeys to consider</h2>
        <Link href="/tours" className="type-small font-semibold text-clay-deep underline underline-offset-4 hover:text-clay">
          See all
        </Link>
      </div>
      <ul className="mt-3 grid gap-4 sm:grid-cols-3">
        {visible.map((tour) => (
          <li key={tour.slug}>
            <Link
              href={`/tours/${tour.slug}`}
              className="portal-card group block overflow-hidden"
            >
              {tour.image ? (
                <Image
                  src={tour.image.src}
                  alt={tour.image.alt}
                  width={tour.image.width}
                  height={tour.image.height}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div aria-hidden="true" className="aspect-[4/5] w-full bg-sand" />
              )}
              <span className="block p-4">
                <span className="type-small block font-semibold">{tour.title}</span>
                <span className="type-caption mt-1 block text-ink/60">
                  {tour.durationDays} {tour.durationDays === 1 ? "day" : "days"} · {tour.destinations}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
