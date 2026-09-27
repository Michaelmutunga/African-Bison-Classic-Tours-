import type { Metadata } from "next";
import { PostCard } from "@/components/cards";
import { MarketingShell } from "@/components/marketing-shell";
import { publicPosts } from "@/server/content-admin";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Safari planning guides, migration notes, costs, packing and East African travel stories from African Bison Classic Tours.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await publicPosts();
  return (
    <MarketingShell
      eyebrow="Journal"
      title="Notes from the field"
      lede={`${posts.length} planning guides and field notes, written and edited by our team.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </MarketingShell>
  );
}
