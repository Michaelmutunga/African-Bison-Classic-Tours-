import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Destination guide",
  description: "East African destination guide from African Bison Classic Tours.",
};

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <MarketingShell eyebrow="Destination" title={slug.replaceAll("-", " ")}>
      <EmptyState
        title="Guide content migrates in Phase 2"
        description="Verified copy from the current site, cleaned of duplication and keyword stuffing."
      />
    </MarketingShell>
  );
}
