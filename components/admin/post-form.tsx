"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";

export interface PostFormValue {
  id?: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
  author: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}

export function PostForm({ initial }: { initial?: PostFormValue }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSending(true);
    const form = new FormData(event.currentTarget);
    const paragraphs = String(form.get("paragraphs") ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const payload = {
      title: String(form.get("title") ?? ""),
      excerpt: String(form.get("excerpt") ?? ""),
      paragraphs,
      author: String(form.get("author") ?? "") || undefined,
      category: String(form.get("category") ?? "") || undefined,
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      seoTitle: String(form.get("seoTitle") ?? "") || undefined,
      seoDescription: String(form.get("seoDescription") ?? "") || undefined,
    };
    try {
      const url = initial?.id ? `/api/admin/posts/${initial.id}` : "/api/admin/posts";
      const response = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, string[]>;
      };
      if (!response.ok || !body.ok) {
        if (body.details) setFieldErrors(body.details);
        setError(body.message ?? "Could not save the post.");
        setSending(false);
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
      setSending(false);
    }
  }

  const errorFor = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={onSubmit} aria-label={initial?.id ? "Edit post" : "New post"}>
      {error ? (
        <div className="mb-4">
          <ErrorState title="Could not save" description={error} />
        </div>
      ) : null}
      <div className="grid gap-4">
        <div>
          <Label htmlFor="post-title">Title</Label>
          <Input id="post-title" name="title" defaultValue={initial?.title ?? ""} required />
          {errorFor("title") ? <FieldError>{errorFor("title")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="post-excerpt">Excerpt</Label>
          <Textarea id="post-excerpt" name="excerpt" rows={2} defaultValue={initial?.excerpt ?? ""} required />
        </div>
        <div>
          <Label htmlFor="post-body">Body (blank line between paragraphs)</Label>
          <Textarea id="post-body" name="paragraphs" rows={12} defaultValue={(initial?.paragraphs ?? []).join("\n\n")} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="post-author">Author</Label>
            <Input id="post-author" name="author" defaultValue={initial?.author ?? ""} />
          </div>
          <div>
            <Label htmlFor="post-category">Category</Label>
            <Input id="post-category" name="category" defaultValue={initial?.category ?? ""} />
          </div>
          <div>
            <Label htmlFor="post-tags">Tags (comma separated)</Label>
            <Input id="post-tags" name="tags" defaultValue={(initial?.tags ?? []).join(", ")} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="post-seo-title">SEO title (optional)</Label>
            <Input id="post-seo-title" name="seoTitle" defaultValue={initial?.seoTitle ?? ""} />
          </div>
          <div>
            <Label htmlFor="post-seo-desc">SEO description (optional)</Label>
            <Input id="post-seo-desc" name="seoDescription" defaultValue={initial?.seoDescription ?? ""} />
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner label="Saving" /> : initial?.id ? "Save changes" : "Create draft"}
        </Button>
        <ButtonLink href="/admin/blog" variant="secondary" size="lg">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
