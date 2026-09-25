"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ErrorState, Spinner } from "@/components/ui/states";

export interface TourFormCategory {
  id: string;
  name: string;
}

export interface TourFormDestination {
  id: string;
  name: string;
}

export interface TourFormDay {
  dayNumber: number;
  title: string;
  body: string;
}

export interface TourFormValue {
  id?: string;
  title: string;
  categoryId: string;
  destinationIds: string[];
  durationDays: number;
  excerpt: string;
  overview: string[];
  includes: string[];
  excludes: string[];
  published: boolean;
  days: TourFormDay[];
}

function lines(value: string[]): string {
  return value.join("\n");
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function TourForm({
  initial,
  categories,
  destinations,
}: {
  initial?: TourFormValue;
  categories: TourFormCategory[];
  destinations: TourFormDestination[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState(false);
  const [days, setDays] = useState<TourFormDay[]>(
    initial?.days ?? [{ dayNumber: 1, title: "", body: "" }],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSending(true);
    const form = new FormData(event.currentTarget);
    const checkedDestinations = form.getAll("destinationIds").map(String);
    const payload = {
      title: String(form.get("title") ?? ""),
      categoryId: String(form.get("categoryId") ?? ""),
      destinationIds: checkedDestinations,
      durationDays: Number(form.get("durationDays") ?? 1),
      excerpt: String(form.get("excerpt") ?? ""),
      overview: splitLines(String(form.get("overview") ?? "")),
      includes: splitLines(String(form.get("includes") ?? "")),
      excludes: splitLines(String(form.get("excludes") ?? "")),
      days: days
        .filter((day) => day.title.trim() && day.body.trim())
        .map((day) => ({
          dayNumber: Number(day.dayNumber) || 1,
          title: day.title.trim(),
          body: day.body.trim(),
        })),
    };
    try {
      const url = initial?.id ? `/api/admin/tours/${initial.id}` : "/api/admin/tours";
      const response = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, string[]>;
        tour?: { id: string };
      };
      if (!response.ok || !body.ok) {
        if (body.details) setFieldErrors(body.details);
        setError(body.message ?? "Could not save the tour.");
        setSending(false);
        return;
      }
      router.push("/admin/tours");
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
      setSending(false);
    }
  }

  const errorFor = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={onSubmit} aria-label={initial?.id ? "Edit tour" : "New tour"}>
      {error ? (
        <div className="mb-4">
          <ErrorState title="Could not save" description={error} />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={initial?.title ?? ""} required />
          {errorFor("title") ? <FieldError>{errorFor("title")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
            <option value="">Select…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {errorFor("categoryId") ? <FieldError>{errorFor("categoryId")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="durationDays">Duration (days)</Label>
          <Input
            id="durationDays"
            name="durationDays"
            type="number"
            min={1}
            max={60}
            defaultValue={initial?.durationDays ?? 3}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={initial?.excerpt ?? ""} required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="overview">Overview (one paragraph per line)</Label>
          <Textarea id="overview" name="overview" rows={4} defaultValue={lines(initial?.overview ?? [])} />
        </div>
        <div>
          <Label htmlFor="includes">Included (one per line)</Label>
          <Textarea id="includes" name="includes" rows={4} defaultValue={lines(initial?.includes ?? [])} />
        </div>
        <div>
          <Label htmlFor="excludes">Not included (one per line)</Label>
          <Textarea id="excludes" name="excludes" rows={4} defaultValue={lines(initial?.excludes ?? [])} />
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="type-label mb-2">Destinations</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {destinations.map((destination) => (
            <label key={destination.id} className="type-small flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="destinationIds"
                value={destination.id}
                defaultChecked={initial?.destinationIds.includes(destination.id)}
                className="size-4 accent-[#b4552d]"
              />
              {destination.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <h2 className="type-h3">Itinerary days</h2>
        <div className="mt-3 grid gap-4">
          {days.map((day, index) => (
            <div key={index} className="rounded-[2px] border border-ink/15 p-4">
              <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
                <div>
                  <Label htmlFor={`day-n-${index}`}>Day</Label>
                  <Input
                    id={`day-n-${index}`}
                    type="number"
                    min={1}
                    max={60}
                    value={day.dayNumber}
                    onChange={(event) => {
                      const next = [...days];
                      const current = next[index];
                      if (current) current.dayNumber = Number(event.target.value);
                      setDays(next);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`day-title-${index}`}>Day title</Label>
                  <Input
                    id={`day-title-${index}`}
                    value={day.title}
                    placeholder="e.g. Day 1: Nairobi – Maasai Mara"
                    onChange={(event) => {
                      const next = [...days];
                      const current = next[index];
                      if (current) current.title = event.target.value;
                      setDays(next);
                    }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor={`day-body-${index}`}>Day description</Label>
                <Textarea
                  id={`day-body-${index}`}
                  rows={3}
                  value={day.body}
                  onChange={(event) => {
                    const next = [...days];
                    const current = next[index];
                    if (current) current.body = event.target.value;
                    setDays(next);
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setDays(days.filter((_, i) => i !== index))}
              >
                Remove day
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            const max = days.reduce((m, d) => Math.max(m, d.dayNumber), 0);
            setDays([...days, { dayNumber: max + 1, title: "", body: "" }]);
          }}
        >
          Add day
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner label="Saving" /> : initial?.id ? "Save changes" : "Create tour"}
        </Button>
        <ButtonLink href="/admin/tours" variant="secondary" size="lg">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
