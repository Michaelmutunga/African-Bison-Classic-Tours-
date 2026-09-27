"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingTraveller } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ErrorState, Spinner } from "@/components/ui/states";

const EMPTY = {
  fullName: "",
  kind: "adult",
  email: "",
  dateOfBirth: "",
  nationality: "",
  passportNumber: "",
  passportExpiry: "",
  emergencyContact: "",
  dietaryNotes: "",
  medicalNotes: "",
};

function toISO(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function TravellerManager({
  reference,
  travellers,
  editable,
}: {
  reference: string;
  travellers: BookingTraveller[];
  editable: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function save(id: string | null, form: FormData) {
    setError(null);
    setSending(true);
    const payload = Object.fromEntries(form.entries());
    try {
      const url = id
        ? `/api/account/travellers/${id}`
        : `/api/account/bookings/${reference}/travellers`;
      const response = await fetch(url, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Could not save traveller.");
        setSending(false);
        return;
      }
      setAdding(false);
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from this safari?`)) return;
    setError(null);
    const response = await fetch(`/api/account/travellers/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setError(body.message ?? "Could not remove traveller.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error ? (
        <div className="mb-4">
          <ErrorState title="Traveller not saved" description={error} />
        </div>
      ) : null}
      {travellers.length === 0 ? (
        <p className="type-small text-ink/70">
          No travellers listed yet. Add everyone travelling — names must match passports.
        </p>
      ) : (
        <ul className="grid gap-3">
          {travellers.map((traveller) => (
            <li key={traveller.id} className="rounded-[2px] border border-ink/15 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="type-small font-semibold">
                  {traveller.fullName}{" "}
                  <span className="type-caption font-normal text-ink/60">· {traveller.kind}</span>
                </p>
                {editable ? (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(editingId === traveller.id ? null : traveller.id);
                      }}
                      className="type-caption cursor-pointer underline underline-offset-4"
                    >
                      {editingId === traveller.id ? "Close" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(traveller.id, traveller.fullName)}
                      className="type-caption cursor-pointer underline underline-offset-4 text-clay-deep"
                    >
                      Remove
                    </button>
                  </span>
                ) : null}
              </div>
              <p className="type-caption mt-1 text-ink/60">
                {[traveller.nationality, traveller.passportNumber ? `Passport ${traveller.passportNumber}` : null]
                  .filter(Boolean)
                  .join(" · ") || "Passport details pending"}
              </p>
              {editingId === traveller.id ? (
                <TravellerForm
                  key={traveller.id}
                  initial={traveller}
                  sending={sending}
                  onSubmit={(form) => save(traveller.id, form)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editable ? (
        adding ? (
          <div className="mt-4 rounded-[2px] border border-ink/15 p-4">
            <TravellerForm sending={sending} onSubmit={(form) => save(null, form)} />
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAdding(true)}>
            Add traveller
          </Button>
        )
      ) : (
        <p className="type-caption mt-3 text-ink/60">
          Traveller details are locked once the safari is underway — contact your planner for changes.
        </p>
      )}
    </div>
  );
}

function TravellerForm({
  initial,
  sending,
  onSubmit,
}: {
  initial?: BookingTraveller;
  sending: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    ...EMPTY,
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
  });
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
      aria-label={initial ? "Edit traveller" : "Add traveller"}
    >
      <div>
        <Label htmlFor={`tf-name-${initial?.id ?? "new"}`}>Full name (as in passport)</Label>
        <Input id={`tf-name-${initial?.id ?? "new"}`} name="fullName" value={values.fullName} onChange={set("fullName")} required />
      </div>
      <div>
        <Label htmlFor={`tf-kind-${initial?.id ?? "new"}`}>Type</Label>
        <Select id={`tf-kind-${initial?.id ?? "new"}`} name="kind" value={values.kind} onChange={set("kind")}>
          <option value="adult">Adult</option>
          <option value="child">Child (2–11)</option>
          <option value="infant">Infant (under 2)</option>
        </Select>
      </div>
      <div>
        <Label htmlFor={`tf-email-${initial?.id ?? "new"}`}>Email</Label>
        <Input id={`tf-email-${initial?.id ?? "new"}`} name="email" type="email" value={values.email} onChange={set("email")} />
      </div>
      <div>
        <Label htmlFor={`tf-dob-${initial?.id ?? "new"}`}>Date of birth</Label>
        <Input id={`tf-dob-${initial?.id ?? "new"}`} name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={set("dateOfBirth")} />
      </div>
      <div>
        <Label htmlFor={`tf-nat-${initial?.id ?? "new"}`}>Nationality</Label>
        <Input id={`tf-nat-${initial?.id ?? "new"}`} name="nationality" value={values.nationality} onChange={set("nationality")} />
      </div>
      <div>
        <Label htmlFor={`tf-pp-${initial?.id ?? "new"}`}>Passport number</Label>
        <Input id={`tf-pp-${initial?.id ?? "new"}`} name="passportNumber" value={values.passportNumber} onChange={set("passportNumber")} />
      </div>
      <div>
        <Label htmlFor={`tf-ppexp-${initial?.id ?? "new"}`}>Passport expiry</Label>
        <Input id={`tf-ppexp-${initial?.id ?? "new"}`} name="passportExpiry" type="date" value={values.passportExpiry} onChange={set("passportExpiry")} />
      </div>
      <div>
        <Label htmlFor={`tf-emg-${initial?.id ?? "new"}`}>Emergency contact</Label>
        <Input id={`tf-emg-${initial?.id ?? "new"}`} name="emergencyContact" value={values.emergencyContact} onChange={set("emergencyContact")} />
      </div>
      <div>
        <Label htmlFor={`tf-diet-${initial?.id ?? "new"}`}>Dietary requirements</Label>
        <Input id={`tf-diet-${initial?.id ?? "new"}`} name="dietaryNotes" value={values.dietaryNotes} onChange={set("dietaryNotes")} />
      </div>
      <div>
        <Label htmlFor={`tf-med-${initial?.id ?? "new"}`}>Medical / accessibility notes</Label>
        <Textarea id={`tf-med-${initial?.id ?? "new"}`} name="medicalNotes" rows={2} value={values.medicalNotes} onChange={set("medicalNotes")} />
      </div>
      <div className="sm:col-span-2">
        <p className="type-caption text-ink/60">
          Visible only to you and African Bison staff — never to other travellers.
        </p>
        <Button type="submit" className="mt-2" disabled={sending}>
          {sending ? <Spinner label="Saving" /> : initial ? "Save changes" : "Add traveller"}
        </Button>
      </div>
    </form>
  );
}
