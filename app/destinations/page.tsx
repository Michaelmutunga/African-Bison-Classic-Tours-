import type { Metadata } from "next";
import { DestinationCard } from "@/components/cards";
import { MarketingShell } from "@/components/marketing-shell";
import { destinations } from "@/lib/content";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Maasai Mara, Amboseli, Serengeti, Ngorongoro and beyond — East African destinations from African Bison Classic Tours.",
};

export default function DestinationsPage() {
  return (
    <MarketingShell
      eyebrow="Destinations"
      title="Where the journeys go"
      lede="Sixteen parks, reserves, lakes, mountains and one remarkable city — the ground our itineraries cover."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((destination) => (
          <DestinationCard key={destination.slug} destination={destination} />
        ))}
      </div>
    </MarketingShell>
  );
}
