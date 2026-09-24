import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";
import { experiences } from "@/lib/content";

export const metadata: Metadata = {
  title: "Nairobi day experiences",
  description:
    "Nairobi National Park, Giraffe Centre, Sheldrick Elephant Orphanage, museums and culture — day experiences from African Bison Classic Tours.",
};

export default function ExperiencesPage() {
  return (
    <MarketingShell
      eyebrow="Day experiences"
      title="Nairobi in a day"
      lede="Wildlife, culture and icons within reach of the airport — ideal first or last days, or layovers. Combine them into the 1-day Nairobi tour."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experiences.map((experience) => (
          <Card key={experience.slug}>
            <CardBody>
              <p className="type-label text-clay-deep">{experience.location}</p>
              <h2 className="type-h3 mt-1">{experience.name}</h2>
              <p className="type-small mt-2 text-ink/70">{experience.excerpt}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <p className="type-small mt-6 text-ink/70">
        See all six in one Private day with our{" "}
        <Link
          href="/tours/1-day-tour-nairobi-safari-culture-wildlife-iconic-attractions"
          className="underline underline-offset-4"
        >
          1-day Nairobi safari, culture and icons
        </Link>
        .
      </p>
    </MarketingShell>
  );
}
