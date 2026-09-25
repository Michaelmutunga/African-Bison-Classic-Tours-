import type { Metadata } from "next";
import { DestinationCard } from "@/components/cards";
import { MarketingShell } from "@/components/marketing-shell";
import { publicDestinations } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Maasai Mara, Amboseli, Serengeti, Ngorongoro and beyond — East African destinations from African Bison Classic Tours.",
};

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const destinations = await publicDestinations();
  return (
    <MarketingShell
      eyebrow="Destinations"
      title="Where the journeys go"
      lede={`${destinations.length} parks, reserves, lakes, mountains and one remarkable city — the ground our itineraries cover.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((destination) => (
          <DestinationCard key={destination.slug} destination={destination} />
        ))}
      </div>
    </MarketingShell>
  );
}
