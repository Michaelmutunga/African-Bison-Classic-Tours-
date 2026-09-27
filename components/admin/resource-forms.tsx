"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
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

export function VehicleForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label="Add vehicle"
      className="grid max-w-xl gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setBusy(true);
        post("/api/admin/vehicles", "POST", {
          registration: String(form.get("registration") ?? ""),
          type: String(form.get("type") ?? ""),
          capacity: Number(form.get("capacity") ?? 6),
          location: String(form.get("location") ?? "") || undefined,
        })
          .then(() => router.refresh())
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      {error ? <ErrorState title="Could not save" description={error} /> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <Label htmlFor="vehicle-reg">Registration</Label>
          <Input id="vehicle-reg" name="registration" required placeholder="KDJ 123A" />
        </div>
        <div>
          <Label htmlFor="vehicle-type">Type</Label>
          <Input id="vehicle-type" name="type" required placeholder="4x4 Safari Land Cruiser" />
        </div>
        <div>
          <Label htmlFor="vehicle-cap">Capacity</Label>
          <Input id="vehicle-cap" name="capacity" type="number" min={1} defaultValue={6} required />
        </div>
      </div>
      <div>
        <Label htmlFor="vehicle-loc">Base location</Label>
        <Input id="vehicle-loc" name="location" placeholder="Nairobi" />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Spinner label="Saving" /> : "Add vehicle"}
      </Button>
    </form>
  );
}

export function GuideForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      aria-label="Add guide"
      className="grid max-w-xl gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setBusy(true);
        post("/api/admin/guides", "POST", {
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? "") || undefined,
          languages: String(form.get("languages") ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        })
          .then(() => router.refresh())
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      {error ? <ErrorState title="Could not save" description={error} /> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <Label htmlFor="guide-name">Name</Label>
          <Input id="guide-name" name="name" required />
        </div>
        <div>
          <Label htmlFor="guide-phone">Phone</Label>
          <Input id="guide-phone" name="phone" type="tel" />
        </div>
        <div>
          <Label htmlFor="guide-lang">Languages (comma separated)</Label>
          <Input id="guide-lang" name="languages" placeholder="English, Swahili" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Spinner label="Saving" /> : "Add guide"}
      </Button>
    </form>
  );
}

export function DeleteResource({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Delete ${label}`}
        onClick={() => {
          if (!window.confirm(`Delete ${label}?`)) return;
          post(url, "DELETE", {}).then(() => router.refresh()).catch((err: Error) => setError(err.message));
        }}
      >
        Delete
      </Button>
    </span>
  );
}
