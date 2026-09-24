import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PostCard } from "@/components/cards";
import { JsonLd, breadcrumbJsonLd } from "@/components/json-ld";
import { Container } from "@/components/ui/layout";
import { formatDate, getPost, posts } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article" },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const date = formatDate(post.publishedAt);
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Journal", href: "/blog" },
    { label: post.title },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(SITE_URL, crumbs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          url: `${SITE_URL}/blog/${post.slug}`,
          ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
          author: { "@type": "Organization", name: "African Bison Classic Tours" },
        }}
      />
      <Breadcrumbs items={crumbs} />
      <Container className="pt-6">
        <article className="max-w-3xl">
          <p className="type-label text-clay-deep">Journal</p>
          <h1 className="type-h1 mt-2 text-balance">{post.title}</h1>
          {date ? <p className="type-caption mt-3 text-ink/60">Published {date}</p> : null}
          {post.paragraphs.map((para, index) => (
            <p key={index} className="type-body mt-5 text-ink/85">
              {para}
            </p>
          ))}
          <p className="type-small mt-8 border-t border-ink/15 pt-4 text-ink/70">
            Planning a trip around this?{" "}
            <Link href="/contact" className="underline underline-offset-4">
              Talk to a safari planner
            </Link>
            .
          </p>
        </article>
        <h2 className="type-h2 mt-12">Keep reading</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <PostCard key={item.slug} post={item} />
          ))}
        </div>
      </Container>
    </>
  );
}
