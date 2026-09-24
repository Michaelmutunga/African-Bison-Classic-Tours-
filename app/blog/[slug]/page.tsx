import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Journal article",
  description: "Travel guide from African Bison Classic Tours.",
};

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <MarketingShell eyebrow="Journal" title={slug.replaceAll("-", " ")}>
      <EmptyState
        title="Article migrates in Phase 2"
        description="Only legitimate, cleaned content is carried over from the current site."
      />
    </MarketingShell>
  );
}
