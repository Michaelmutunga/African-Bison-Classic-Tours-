import type { Metadata } from "next";
import { DestinationsDriftSection } from "@/components/destinations/destinations-drift-section";
import { Container } from "@/components/ui/layout";
import { getPublishedTours, publicDestinations } from "@/lib/catalog";
import {
  buildDestinationSafariCounts,
  buildDriftWallItems,
} from "@/lib/destinations-wall";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Maasai Mara, Amboseli, Serengeti, Ngorongoro and beyond — East African destinations from African Bison Classic Tours.",
};

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  // One destination read plus the cached single tour-table scan; the wall
  // items and ledger counts both derive from these, no extra queries.
  const [destinations, tours] = await Promise.all([
    publicDestinations(),
    getPublishedTours(),
  ]);
  const items = buildDriftWallItems(destinations);
  const safariCounts = buildDestinationSafariCounts(tours, destinations);
  return (
    <>
      <Container className="pt-12 pb-10 sm:pt-16">
        <p className="type-label text-clay-deep">Destinations</p>
        <h1 className="type-h1 mt-2 max-w-3xl text-balance">
          Where the journeys go
        </h1>
        <p className="type-body mt-4 text-ink/75">
          {destinations.length} parks, reserves, lakes, mountains and one
          remarkable city. The wall below holds the places we have
          photographed on the road. The ledger lists them all.
        </p>
      </Container>
      <DestinationsDriftSection
        items={items}
        destinations={destinations}
        safariCounts={safariCounts}
      />
    </>
  );
}
