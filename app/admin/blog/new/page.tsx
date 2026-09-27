import { PostForm } from "@/components/admin/post-form";

export default function NewPostPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="type-h3">New post</h2>
      <p className="type-small mt-1 text-ink/70">
        Posts start as drafts. Publishing — now or scheduled — is a separate, permission-gated step.
      </p>
      <div className="mt-4">
        <PostForm />
      </div>
    </div>
  );
}
