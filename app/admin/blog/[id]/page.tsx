import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/post-form";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { currentUser } from "@/lib/auth";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "catalogue.write")) throw new ForbiddenError("catalogue.write");
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="max-w-3xl">
      <h2 className="type-h3">Edit post</h2>
      <p className="type-caption mt-1 text-ink/60">
        /{post.slug} · {post.status}
        {post.scheduledFor ? ` · scheduled ${new Date(post.scheduledFor).toLocaleString("en-GB")}` : ""}
      </p>
      <div className="mt-4">
        <PostForm
          initial={{
            id: post.id,
            title: post.title,
            excerpt: post.excerpt,
            paragraphs: post.paragraphs,
            author: post.author ?? "",
            category: post.category ?? "",
            tags: post.tags,
            seoTitle: post.seoTitle ?? "",
            seoDescription: post.seoDescription ?? "",
          }}
        />
      </div>
    </div>
  );
}
