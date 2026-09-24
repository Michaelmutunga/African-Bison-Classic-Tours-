import type { Metadata } from "next";
import Link from "next/link";
import { TourCard } from "@/components/cards";
import { MarketingShell } from "@/components/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, categoryLabel, toursByCategory, type CategorySlug } from "@/lib/content";

export const metadata: Metadata = {
  title: "Safari tours",
  description:
    "Kenya, Tanzania and combined safari itineraries with day-by-day plans from African Bison Classic Tours.",
};

const ALL = "all";

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active: CategorySlug | typeof ALL =
    CATEGORIES.some((c) => c.slug === category) ? (category as CategorySlug) : ALL;
  const shown = active === ALL ? CATEGORIES.flatMap((c) => toursByCategory(c.slug)) : toursByCategory(active);

  return (
    <MarketingShell
      eyebrow="Safaris"
      title="Journeys across Kenya and Tanzania"
      lede="Real itineraries with day-by-day plans, inclusions and exclusions. Pricing is quoted per trip — nothing is invented here."
    >
      <nav aria-label="Filter by region" className="flex flex-wrap gap-2">
        <Link href="/tours">
          <Badge tone={active === ALL ? "ink" : "neutral"}>All ({CATEGORIES.flatMap((c) => toursByCategory(c.slug)).length})</Badge>
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={`/tours?category=${c.slug}`}>
            <Badge tone={active === c.slug ? "ink" : "neutral"}>
              {c.label} ({toursByCategory(c.slug).length})
            </Badge>
          </Link>
        ))}
      </nav>
      <p className="type-small mt-4 text-ink/70" aria-live="polite">
        Showing {shown.length} {active === ALL ? "safaris" : categoryLabel(active).toLowerCase()}.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>
    </MarketingShell>
  );
}
