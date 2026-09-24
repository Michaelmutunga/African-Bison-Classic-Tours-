import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Travel information",
  description:
    "Seasons, documents, health and packing guidance for East African safaris with African Bison Classic Tours.",
};

const SECTIONS = [
  {
    title: "Seasons and the migration",
    body: "The wildebeest migration typically moves between the Serengeti and the Maasai Mara with Mara River crossings from July to October. Calving season in the southern Serengeti falls around January to March. The long rains generally run March to May and the short rains around November — parks stay open year-round and green-season travel means fewer vehicles and lower rates. Treat all timing as guidance; wildlife does not follow a calendar.",
  },
  {
    title: "Documents and visas",
    body: "Most visitors need a passport valid well beyond their travel dates and an electronic travel authorisation or visa arranged before departure. Kenya uses an eTA system and Tanzania an e-visa. Requirements change — always verify against the official government immigration sites before you book flights, and tell us your nationality so we can point you correctly.",
  },
  {
    title: "Health and insurance",
    body: "Consult your doctor or travel clinic about vaccinations and malaria prophylaxis well before departure. Comprehensive travel insurance that covers medical evacuation is strongly recommended for every safari. Carry any personal medication in original packaging with prescriptions.",
  },
  {
    title: "Money",
    body: "Our quotes are most commonly prepared in US dollars; Kenyan shillings are used locally. Cards are widely accepted in cities and lodges, but carry some cash for tips, markets and small vendors. ATMs are available in Nairobi and Arusha.",
  },
  {
    title: "Packing",
    body: "Soft bags beat hard suitcases, especially on bush flights with strict weight limits. Neutral-coloured layers, a warm fleece for early mornings, sun protection, binoculars and a camera with spare batteries cover most safaris. A full packing list ships with your pre-trip documents once you book.",
  },
] as const;

export default function TravelInformationPage() {
  return (
    <MarketingShell
      eyebrow="Good to know"
      title="Travel information"
      lede="Planning guidance, not fine print. Official entry and health rules change — we point you to the source."
    >
      <div className="grid max-w-3xl gap-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardBody>
              <h2 className="type-h3">{section.title}</h2>
              <p className="type-small mt-2 text-ink/75">{section.body}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <p className="type-small mt-6 text-ink/70">
        Something specific?{" "}
        <Link href="/contact" className="underline underline-offset-4">
          Ask a safari planner
        </Link>{" "}
        or read the{" "}
        <Link href="/faq" className="underline underline-offset-4">
          FAQ
        </Link>
        .
      </p>
    </MarketingShell>
  );
}
