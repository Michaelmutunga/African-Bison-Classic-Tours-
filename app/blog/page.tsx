import type { Metadata } from "next";
import { PostCard } from "@/components/cards";
import { MarketingShell } from "@/components/marketing-shell";
import { posts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Safari planning guides, migration notes, costs, packing and East African travel stories from African Bison Classic Tours.",
};

export default function BlogPage() {
  return (
    <MarketingShell
      eyebrow="Journal"
      title="Notes from the field"
      lede={`${posts.length} planning guides and field notes, migrated from our travel library and cleaned of duplication.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </MarketingShell>
  );
}
