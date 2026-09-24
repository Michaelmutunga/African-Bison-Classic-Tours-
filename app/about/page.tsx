import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";
import { about } from "@/lib/content";

export const metadata: Metadata = {
  title: "About us",
  description:
    "African Bison Classic Tours — an independent, private tour and travel company in Nairobi, Kenya.",
};

const FACTS = [
  { label: "Base", value: "Nairobi, Kenya — JKIA Airport, 1st Floor, Suite 1" },
  { label: "Coverage", value: "Kenya, Tanzania, Uganda gorilla treks, Zanzibar extensions" },
  { label: "Style", value: "Private and tailor-made safaris, group and corporate travel" },
  { label: "Guides", value: "Experienced English-speaking driver-guides" },
] as const;

export default function AboutPage() {
  return (
    <MarketingShell
      eyebrow="About"
      title="An independent Nairobi safari company"
      lede="Who we are, in our own words — migrated from our site and lightly cleaned."
    >
      {about.paragraphs.map((para, index) => (
        <p key={index} className="type-body mt-5 max-w-3xl text-ink/85">
          {para}
        </p>
      ))}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {FACTS.map((fact) => (
          <Card key={fact.label}>
            <CardBody>
              <p className="type-label text-clay-deep">{fact.label}</p>
              <p className="type-small mt-1">{fact.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </MarketingShell>
  );
}
