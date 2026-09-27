"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.message ?? `Request failed (${response.status})`);
}

export function PostStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scheduleFor, setScheduleFor] = useState("");
  const [scheduling, setScheduling] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const transitions: Record<string, string[]> = {
    DRAFT: ["PUBLISHED", "ARCHIVED"],
    SCHEDULED: ["DRAFT", "PUBLISHED"],
    PUBLISHED: ["DRAFT", "ARCHIVED"],
    ARCHIVED: ["DRAFT"],
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      {(transitions[status] ?? []).map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === "PUBLISHED" ? "accent" : "secondary"}
          disabled={busy}
          onClick={() => run(() => api(`/api/admin/posts/${id}`, "PATCH", { status: next }))}
        >
          {next === "PUBLISHED" ? "Publish now" : next.charAt(0) + next.slice(1).toLowerCase()}
        </Button>
      ))}
      {status === "DRAFT" ? (
        scheduling ? (
          <span className="inline-flex items-center gap-2">
            <Label htmlFor={`schedule-${id}`} className="sr-only">
              Publish date
            </Label>
            <Input
              id={`schedule-${id}`}
              type="datetime-local"
              value={scheduleFor}
              onChange={(e) => setScheduleFor(e.target.value)}
            />
            <Button
              size="sm"
              disabled={busy || !scheduleFor}
              onClick={() =>
                run(() =>
                  api(`/api/admin/posts/${id}`, "PATCH", {
                    status: "SCHEDULED",
                    scheduledFor: new Date(scheduleFor).toISOString(),
                  }).then(() => setScheduling(false))
                )
              }
            >
              Schedule
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setScheduling(true)}>
            Schedule…
          </Button>
        )
      ) : null}
    </span>
  );
}

export function DeletePost({ id, title }: { id: string; title: string }) {
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
      Delete “{title}”?
      <Button
        variant="ghost"
        size="sm"
        onClick={() => api(`/api/admin/posts/${id}`, "DELETE").then(() => router.refresh())}
      >
        Yes
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}
