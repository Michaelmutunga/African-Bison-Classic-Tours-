"use client";

import { useState } from "react";
import type { BookingTraveller } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ErrorState, Spinner } from "@/components/ui/states";

function toISO(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function InviteForm({
  token,
  initial,
}: {
  token: string;
  initial: BookingTraveller | null;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    fullName: initial?.fullName ?? "",
    kind: initial?.kind ?? "adult",
    email: initial?.email ?? "",
    dateOfBirth: toISO(initial?.dateOfBirth ?? null),
    nationality: initial?.nationality ?? "",
    passportNumber: initial?.passportNumber ?? "",
    passportExpiry: toISO(initial?.passportExpiry ?? null),
    emergencyContact: initial?.emergencyContact ?? "",
    dietaryNotes: initial?.dietaryNotes ?? "",
    medicalNotes: initial?.medicalNotes ?? "",
    roomPreference: initial?.roomPreference ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(!!initial);
  const [sending, setSending] = useState(false);
  const set =
    (key: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Could not save your details.");
        setSending(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-[2px] border border-earth/40 bg-earth/10 px-6 py-6">
        <h2 className="type-h3">You’re on the list — thank you.</h2>
        <p className="type-small mt-2 text-ink/75">
          Your details are saved. Revisit this same link any time before the
          safari to update them. Your organiser sees you’re complete, never
          your passport or medical notes.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => setDone(false)}>
          Update my details
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={(node) => {
        node?.setAttribute("data-ready", "true");
      }}
      onSubmit={onSubmit}
      aria-label="Traveller details"
      className="grid gap-3 sm:grid-cols-2"
    >
      {error ? (
        <div className="sm:col-span-2">
          <ErrorState title="Details not saved" description={error} />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Label htmlFor="inv-name">Full name (as in passport)</Label>
        <Input id="inv-name" value={values.fullName} onChange={set("fullName")} autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="inv-kind">Type</Label>
        <Select id="inv-kind" value={values.kind} onChange={set("kind")}>
          <option value="adult">Adult</option>
          <option value="child">Child (2–11)</option>
          <option value="infant">Infant (under 2)</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="inv-email">Email</Label>
        <Input id="inv-email" type="email" value={values.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="inv-dob">Date of birth</Label>
        <Input id="inv-dob" type="date" value={values.dateOfBirth} onChange={set("dateOfBirth")} />
      </div>
      <div>
        <Label htmlFor="inv-nat">Nationality</Label>
        <Input id="inv-nat" value={values.nationality} onChange={set("nationality")} />
      </div>
      <div>
        <Label htmlFor="inv-pp">Passport number</Label>
        <Input id="inv-pp" value={values.passportNumber} onChange={set("passportNumber")} />
      </div>
      <div>
        <Label htmlFor="inv-ppexp">Passport expiry</Label>
        <Input id="inv-ppexp" type="date" value={values.passportExpiry} onChange={set("passportExpiry")} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="inv-emg">Emergency contact</Label>
        <Input id="inv-emg" value={values.emergencyContact} onChange={set("emergencyContact")} placeholder="Name, relationship, phone" />
      </div>
      <div>
        <Label htmlFor="inv-diet">Dietary requirements</Label>
        <Input id="inv-diet" value={values.dietaryNotes} onChange={set("dietaryNotes")} />
      </div>
      <div>
        <Label htmlFor="inv-room">Room preference</Label>
        <Input
          id="inv-room"
          value={values.roomPreference}
          onChange={set("roomPreference")}
          placeholder="e.g. Twin share with Amina, single room"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="inv-med">Medical / accessibility notes</Label>
        <Textarea id="inv-med" rows={2} value={values.medicalNotes} onChange={set("medicalNotes")} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner label="Saving" /> : initial ? "Save changes" : "Join the safari"}
        </Button>
      </div>
    </form>
  );
}
