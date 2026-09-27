"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";

async function post(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.message ?? `Request failed (${response.status})`);
}

export function FaqForm({ initial }: { initial?: { id: string; question: string; answer: string; order: number; published: boolean } }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label={initial ? "Edit FAQ" : "New FAQ"}
      className="grid max-w-2xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setBusy(true);
        post(initial ? `/api/admin/faqs/${initial.id}` : "/api/admin/faqs", initial ? "PATCH" : "POST", {
          question: String(form.get("question") ?? ""),
          answer: String(form.get("answer") ?? ""),
          order: Number(form.get("order") ?? 0),
          published: form.get("published") === "on",
        })
          .then(() => router.refresh())
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      {error ? <ErrorState title="Could not save" description={error} /> : null}
      <div>
        <Label htmlFor={`faq-q-${initial?.id ?? "new"}`}>Question</Label>
        <Input id={`faq-q-${initial?.id ?? "new"}`} name="question" defaultValue={initial?.question ?? ""} required />
      </div>
      <div>
        <Label htmlFor={`faq-a-${initial?.id ?? "new"}`}>Answer</Label>
        <Textarea id={`faq-a-${initial?.id ?? "new"}`} name="answer" rows={4} defaultValue={initial?.answer ?? ""} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`faq-o-${initial?.id ?? "new"}`}>Order</Label>
          <Input id={`faq-o-${initial?.id ?? "new"}`} name="order" type="number" defaultValue={initial?.order ?? 0} />
        </div>
        <label className="type-small flex cursor-pointer items-center gap-2 self-end pb-2">
          <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} className="size-4 accent-[#b4552d]" />
          Published
        </label>
      </div>
      <Button type="submit" size="sm" disabled={busy} className="justify-self-start">
        {busy ? <Spinner label="Saving" /> : initial ? "Save FAQ" : "Add FAQ"}
      </Button>
    </form>
  );
}

export function DeleteFaq({ id, question }: { id: string; question: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <span className="type-caption inline-flex items-center gap-2">
      Delete “{question.slice(0, 40)}…”?
      <Button variant="ghost" size="sm" onClick={() => post(`/api/admin/faqs/${id}`, "DELETE", {}).then(() => router.refresh())}>
        Yes
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}

export function MediaForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label="Add media asset"
      className="grid max-w-2xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setBusy(true);
        post("/api/admin/media", "POST", {
          url: String(form.get("url") ?? ""),
          alt: String(form.get("alt") ?? ""),
          caption: String(form.get("caption") ?? "") || undefined,
          credit: String(form.get("credit") ?? "") || undefined,
        })
          .then(() => {
            (event.target as HTMLFormElement).reset();
            router.refresh();
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      {error ? <ErrorState title="Could not save" description={error} /> : null}
      <div>
        <Label htmlFor="media-url">File URL (https)</Label>
        <Input id="media-url" name="url" type="url" required placeholder="https://…" />
      </div>
      <div>
        <Label htmlFor="media-alt">Alt text (required for accessibility)</Label>
        <Input id="media-alt" name="alt" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="media-caption">Caption</Label>
          <Input id="media-caption" name="caption" />
        </div>
        <div>
          <Label htmlFor="media-credit">Credit / licence</Label>
          <Input id="media-credit" name="credit" placeholder="e.g. Staff photo, CC-BY" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy} className="justify-self-start">
        {busy ? <Spinner label="Saving" /> : "Add asset"}
      </Button>
    </form>
  );
}

export function SettingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label="Set site setting"
      className="grid max-w-2xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setBusy(true);
        post("/api/admin/settings", "POST", {
          key: String(form.get("key") ?? ""),
          value: String(form.get("value") ?? ""),
        })
          .then(() => {
            (event.target as HTMLFormElement).reset();
            router.refresh();
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      {error ? <ErrorState title="Could not save" description={error} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="setting-key">Key (e.g. business.hours)</Label>
          <Input id="setting-key" name="key" required />
        </div>
        <div>
          <Label htmlFor="setting-value">Value</Label>
          <Input id="setting-value" name="value" required />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy} className="justify-self-start">
        {busy ? <Spinner label="Saving" /> : "Save setting"}
      </Button>
    </form>
  );
}
