"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ErrorState, Spinner } from "@/components/ui/states";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; reference: string }
  | { kind: "error"; message: string };

const INTERESTS = ["Wildlife", "Big Five", "Great Migration", "Photography", "Culture", "Beach", "Mountains", "Family", "Honeymoon", "Adventure"];
const TIERS = ["value", "mid-range", "luxury"];
const BUDGETS = ["Under $2,000", "$2,000 – $5,000", "$5,000 – $10,000", "$10,000+", "Not sure yet"];

export interface RequestTour {
  slug: string;
  title: string;
  durationDays: number;
}

export function SubmissionForm({ tour, destinations }: { tour?: RequestTour; destinations: { slug: string; name: string }[] }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const get = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value.trim() : "";
    };
    const getAll = (name: string) => form.getAll(name).filter((v): v is string => typeof v === "string");
    const toISO = (day: string) => (day ? `${day}T00:00:00Z` : undefined);
    const ages = get("childrenAges")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 17);
    const start = get("travelStart");
    const end = get("travelEnd");
    const customDestinations = tour ? [] : getAll("customDestinations");
    const customNotes = tour ? "" : get("customNotes");
    const payload: Record<string, unknown> = {
      customerName: get("customerName"),
      customerEmail: get("customerEmail"),
      customerPhone: get("customerPhone") || undefined,
      company: get("company"),
      source: tour ? "TOUR" : "CUSTOM",
      ...(tour ? { tourSlug: tour.slug } : {}),
      ...(start ? { travelStart: toISO(start) } : {}),
      ...(end ? { travelEnd: toISO(end) } : {}),
      flexibleDates: form.get("flexibleDates") === "on",
      adults: Number(get("adults") || "2"),
      children: Number(get("children") || "0"),
      childrenAges: ages,
      nationality: get("nationality") || undefined,
      arrivalFlight: get("arrivalFlight") || undefined,
      departureFlight: get("departureFlight") || undefined,
      airport: get("airport") || undefined,
      accommodationTier: get("accommodationTier") || undefined,
      budgetRange: get("budgetRange") || undefined,
      interests: getAll("interests"),
      specialRequests: get("specialRequests") || undefined,
      occasion: get("occasion") || undefined,
      pickupLocation: get("pickupLocation") || undefined,
      contactChannel: get("contactChannel") || undefined,
      ...(!tour ? { customItinerary: { destinations: customDestinations, notes: customNotes } } : {}),
    };
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        message?: string;
        details?: Record<string, string[]>;
      };
      if (!response.ok || !body.ok || !body.reference) {
        if (body.details) setFieldErrors(body.details);
        setStatus({ kind: "error", message: body.message ?? "Could not send your request." });
        return;
      }
      setStatus({ kind: "sent", reference: body.reference });
    } catch {
      setStatus({ kind: "error", message: "Network problem — check your connection and try again." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-[2px] border border-earth/40 bg-earth/10 px-6 py-8">
        <p className="type-h3">Request received — karibu.</p>
        <p className="type-small mt-2 text-ink/75">
          Your booking reference is <strong className="type-numeric">{status.reference}</strong>.
          A safari planner replies by email, usually within one business day. Nothing is
          booked or charged until you approve a quote.
        </p>
      </div>
    );
  }

  const errorFor = (name: string) => fieldErrors[name]?.[0];

  return (
    <form
      ref={(node) => {
        node?.setAttribute("data-ready", "true");
      }}
      onSubmit={onSubmit}
      noValidate
      aria-label="Safari request form"
    >
      {status.kind === "error" ? (
        <div className="mb-4">
          <ErrorState title="Could not send" description={status.message} />
        </div>
      ) : null}
      {tour ? (
        <p className="type-small mb-4 rounded-[2px] bg-sand/40 px-4 py-3">
          Requesting: <strong>{tour.title}</strong> · {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"}
        </p>
      ) : null}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <h3 className="type-h3">Contact</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="customerName">Full name</Label>
          <Input id="customerName" name="customerName" autoComplete="name" required aria-invalid={!!errorFor("customerName")} />
          {errorFor("customerName") ? <FieldError>{errorFor("customerName")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="customerEmail">Email</Label>
          <Input id="customerEmail" name="customerEmail" type="email" autoComplete="email" required aria-invalid={!!errorFor("customerEmail")} />
          {errorFor("customerEmail") ? <FieldError>{errorFor("customerEmail")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="customerPhone">Phone / WhatsApp</Label>
          <Input id="customerPhone" name="customerPhone" type="tel" autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" name="nationality" autoComplete="country-name" placeholder="e.g. German" />
        </div>
        <div>
          <Label htmlFor="contactChannel">Preferred contact</Label>
          <Select id="contactChannel" name="contactChannel" defaultValue="email">
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="occasion">Occasion (optional)</Label>
          <Input id="occasion" name="occasion" placeholder="e.g. Honeymoon, 50th birthday" />
        </div>
      </div>

      <h3 className="type-h3 mt-8">Trip</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="travelStart">Start date</Label>
          <Input id="travelStart" name="travelStart" type="date" />
        </div>
        <div>
          <Label htmlFor="travelEnd">End date</Label>
          <Input id="travelEnd" name="travelEnd" type="date" />
        </div>
        <div className="flex items-center gap-2">
          <input id="flexibleDates" name="flexibleDates" type="checkbox" className="h-4 w-4" />
          <Label htmlFor="flexibleDates">My dates are flexible</Label>
        </div>
        <div />
        <div>
          <Label htmlFor="adults">Adults</Label>
          <Input id="adults" name="adults" type="number" min={1} max={18} defaultValue={2} required />
        </div>
        <div>
          <Label htmlFor="children">Children</Label>
          <Input id="children" name="children" type="number" min={0} max={18} defaultValue={0} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="childrenAges">Children’s ages</Label>
          <Input id="childrenAges" name="childrenAges" placeholder="e.g. 7, 10" />
          <FieldHint>Comma-separated, helps planners with rooms and park fees.</FieldHint>
        </div>
        <div>
          <Label htmlFor="arrivalFlight">Arrival flight</Label>
          <Input id="arrivalFlight" name="arrivalFlight" placeholder="e.g. KQ 310, 12 Aug" />
        </div>
        <div>
          <Label htmlFor="departureFlight">Departure flight</Label>
          <Input id="departureFlight" name="departureFlight" placeholder="e.g. ET 305, 24 Aug" />
        </div>
        <div>
          <Label htmlFor="airport">Airport</Label>
          <Input id="airport" name="airport" placeholder="e.g. Nairobi (NBO)" />
        </div>
        <div>
          <Label htmlFor="pickupLocation">Pickup location</Label>
          <Input id="pickupLocation" name="pickupLocation" placeholder="e.g. Hotel lobby, Airbnb address" />
        </div>
        <div>
          <Label htmlFor="accommodationTier">Accommodation style</Label>
          <Select id="accommodationTier" name="accommodationTier" defaultValue="">
            <option value="">No preference</option>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>{tier}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="budgetRange">Budget range</Label>
          <Select id="budgetRange" name="budgetRange" defaultValue="">
            <option value="">Prefer not to say</option>
            {BUDGETS.map((budget) => (
              <option key={budget} value={budget}>{budget}</option>
            ))}
          </Select>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="type-label">Interests</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {INTERESTS.map((interest) => (
            <label key={interest} className="type-small flex items-center gap-2">
              <input name="interests" type="checkbox" value={interest} className="h-4 w-4" />
              {interest}
            </label>
          ))}
        </div>
      </fieldset>

      {!tour ? (
        <div className="mt-6">
          <fieldset>
            <legend className="type-label">Where do you want to go?</legend>
            <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {destinations.map((destination) => (
                <label key={destination.slug} className="type-small flex items-center gap-2">
                  <input name="customDestinations" type="checkbox" value={destination.name} className="h-4 w-4" />
                  {destination.name}
                </label>
              ))}
            </div>
          </fieldset>
          {errorFor("customItinerary") ? <FieldError>{errorFor("customItinerary")}</FieldError> : null}
          <div className="mt-4">
            <Label htmlFor="customNotes">Your ideal trip</Label>
            <Textarea
              id="customNotes"
              name="customNotes"
              placeholder="Pace, must-sees, accommodation style, anything else…"
              aria-describedby="customNotes-hint"
            />
            <FieldHint id="customNotes-hint">Destinations above or a few sentences here — either works.</FieldHint>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <Label htmlFor="specialRequests">Special requests</Label>
        <Textarea
          id="specialRequests"
          name="specialRequests"
          placeholder="Dietary needs, accessibility, celebrations, fears, anything we should know…"
        />
      </div>

      <div className="mt-5">
        <Button type="submit" size="lg" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? <Spinner label="Sending" /> : tour ? "Request this safari" : "Send my safari request"}
        </Button>
      </div>
    </form>
  );
}
