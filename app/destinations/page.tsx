import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Maasai Mara, Amboseli, Serengeti, Ngorongoro and beyond — East African destinations.",
};

export default function DestinationsPage() {
  return (
    <MarketingShell
      eyebrow="Destinations"
      title="Where the journeys go"
      lede="Destination guides with maps, seasons and planning notes arrive in Phase 2."
    >
      <EmptyState
        title="Destination guides coming in Phase 2"
        description="Maasai Mara, Amboseli, Serengeti, Ngorongoro, Tarangire, Manyara, Nakuru and more."
      />
    </MarketingShell>
  );
}
