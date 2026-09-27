import Link from "next/link";
import { DeletePost, PostStatusButtons } from "@/components/admin/post-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listPosts } from "@/server/content-admin";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

const TONE: Record<string, "sand" | "earth" | "neutral" | "clay"> = {
  DRAFT: "neutral",
  SCHEDULED: "sand",
  PUBLISHED: "earth",
  ARCHIVED: "clay",
};

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const valid = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
  const filter = valid.find((s) => s === status);
  const posts = await listPosts(await requestActor(), filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-h3">Journal ({posts.length})</h2>
        <div className="flex gap-2">
          <ButtonLink href="/admin/blog" variant="secondary" size="sm">
            All
          </ButtonLink>
          <ButtonLink href="/admin/blog/new" size="sm">
            New post
          </ButtonLink>
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No posts in this view" description="Drafts start here." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Blog posts">
            <TableHead>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <TableCell>
                    <Link href={`/admin/blog/${post.id}`} className="font-medium underline underline-offset-4">
                      {post.title}
                    </Link>
                    <span className="type-caption block text-ink/55">
                      /{post.slug}
                      {post.scheduledFor
                        ? ` · scheduled ${new Date(post.scheduledFor).toLocaleString("en-GB")}`
                        : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={TONE[post.status]}>{post.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <PostStatusButtons id={post.id} status={post.status} />
                      <DeletePost id={post.id} title={post.title} />
                    </span>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}
