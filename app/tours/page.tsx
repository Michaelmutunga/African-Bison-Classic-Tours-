import type { Metadata } from "next";
import Link from "next/link";
import { TourCard } from "@/components/cards";
import { MarketingShell } from "@/components/marketing-shell";
import { Badge } from "@/components/ui/badge";
import { publicCategories, publicTours } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Safari tours",
  description:
    "Kenya, Tanzania and combined safari itineraries with day-by-day plans from African Bison Classic Tours.",
};

export const dynamic = "force-dynamic";

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const categories = await publicCategories();
  const active = categories.some((c) => c.slug === category) ? (category as string) : "all";
  const shown = await publicTours(active === "all" ? undefined : active);
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  const activeLabel = categories.find((c) => c.slug === active)?.label;

  return (
    <MarketingShell
      eyebrow="Safaris"
      title="Journeys across Kenya and Tanzania"
      lede="Real itineraries with day-by-day plans, inclusions and exclusions. Pricing is quoted per trip — nothing is invented here."
    >
      <nav aria-label="Filter by region" className="flex flex-wrap gap-2">
        <Link href="/tours">
          <Badge tone={active === "all" ? "ink" : "neutral"}>All ({total})</Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/tours?category=${c.slug}`}>
            <Badge tone={active === c.slug ? "ink" : "neutral"}>
              {c.label} ({c.count})
            </Badge>
          </Link>
        ))}
      </nav>
      <p className="type-small mt-4 text-ink/70" aria-live="polite">
        Showing {shown.length} {active === "all" ? "safaris" : activeLabel?.toLowerCase()}.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((tour) => (
          <TourCard key={tour.slug} tour={tour} />
        ))}
      </div>
    </MarketingShell>
  );
}
