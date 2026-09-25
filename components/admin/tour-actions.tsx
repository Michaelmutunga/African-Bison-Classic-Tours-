"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/tours/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <Button variant={published ? "secondary" : "accent"} size="sm" onClick={toggle} disabled={busy}>
      {published ? "Unpublish" : "Publish"}
    </Button>
  );
}

export function DeleteTour({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    await fetch(`/api/admin/tours/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

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
      <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
        Yes
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}
