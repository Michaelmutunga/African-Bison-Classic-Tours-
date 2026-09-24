import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Journal",
  description: "Safari planning guides, migration notes and East African travel stories.",
};

export default function BlogPage() {
  return (
    <MarketingShell
      eyebrow="Journal"
      title="Notes from the field"
      lede="The travel-guide library migrates in Phase 2 with cleaned, de-duplicated articles."
    >
      <EmptyState
        title="Articles coming in Phase 2"
        description="Migration seasons, packing, Big Five, honeymoons, beach extensions and responsible tourism."
      />
    </MarketingShell>
  );
}
