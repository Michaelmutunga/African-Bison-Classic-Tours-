import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Safari tours",
  description:
    "Kenya, Tanzania and combined safari itineraries from African Bison Classic Tours.",
};

export default function ToursPage() {
  return (
    <MarketingShell
      eyebrow="Safaris"
      title="Journeys across Kenya and Tanzania"
      lede="The structured, bookable catalogue lands in Phase 3. Nothing here is hard-coded sales copy."
    >
      <EmptyState
        title="Catalogue coming in Phase 3"
        description="Tour products, day-by-day itineraries, accommodation options and pricing will render from the database."
      />
    </MarketingShell>
  );
}
