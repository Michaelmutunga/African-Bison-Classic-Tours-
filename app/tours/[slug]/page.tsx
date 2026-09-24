import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Safari details",
  description: "Day-by-day safari itinerary from African Bison Classic Tours.",
};

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <MarketingShell eyebrow="Safari" title={slug.replaceAll("-", " ")}>
      <EmptyState
        title="Itinerary renders from structured data in Phase 3"
        description="Days, accommodation, meals, activities, inclusions and pricing will be database-driven, never a markup blob."
      />
    </MarketingShell>
  );
}
