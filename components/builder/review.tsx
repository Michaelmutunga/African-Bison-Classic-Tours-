"use client";

import { useMemo, useState } from "react";
import { useBuilder } from "@/components/builder/builder-context";
import { StepHeading } from "@/components/builder/option-cards";
import { SafariProfile } from "@/components/builder/profile";
import { RouteMap } from "@/components/builder/route-map";
import type { BuilderStepData } from "@/components/builder/steps";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";
import { Timeline } from "@/components/ui/timeline";
import {
  draftSummary,
  generateItinerary,
  journeyProfile,
  tripDays,
  validateDraft,
} from "@/lib/builder";

export function ReviewStep({ data }: { data: BuilderStepData }) {
  const { draft, reset } = useBuilder();
  const errors = validateDraft(draft);

  const destinationNames = useMemo(
    () => new Map(data.destinations.map((d) => [d.slug, d.name] as const)),
    [data.destinations],
  );
  const addOnNames = useMemo(
    () => new Map(data.addOns.map((a) => [a.slug, a.name] as const)),
    [data.addOns],
  );
  const destinationInfos = useMemo(
    () =>
      draft.destinationSlugs.map((slug) => ({
        slug,
        name: destinationNames.get(slug) ?? slug,
      })),
    [draft.destinationSlugs, destinationNames],
  );

  const itinerary = useMemo(() => {
    if (errors.length > 0) return null;
    try {
      return generateItinerary(draft, destinationInfos, addOnNames);
    } catch {
      return null;
    }
  }, [draft, destinationInfos, addOnNames, errors]);

  if (errors.length > 0 || !itinerary) {
    return (
      <div>
        <StepHeading title="Almost there" lede="A few details are missing before your plan is complete." />
        <div role="alert" className="type-small mt-4 rounded-[2px] border border-clay/40 bg-clay/5 px-4 py-3">
          <ul className="list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const travellers = `${draft.adults} adult${draft.adults === 1 ? "" : "s"}${
    draft.children > 0 ? `, ${draft.children} ${draft.children === 1 ? "child" : "children"}` : ""
  }${draft.infants > 0 ? `, ${draft.infants} infant${draft.infants === 1 ? "" : "s"}` : ""}`;

  return (
    <div>
      <StepHeading
        title="Your safari plan"
        lede={`${itinerary.totalDays} days · ${travellers} · ${draft.startDate} to ${draft.endDate}. Availability is confirmed by a planner — nothing here is auto-guaranteed.`}
      />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h3 className="type-h3">Day by day</h3>
          <div className="mt-4">
            <Timeline
              entries={itinerary.days.map((day) => ({
                id: `day-${day.n}`,
                marker: `Day ${day.n} · ${day.date}`,
                title: day.title,
                detail: (
                  <>
                    {day.legs.map((leg, i) => (
                      <p key={i} className="mt-1">
                        {leg.text}
                      </p>
                    ))}
                    {day.activities.length > 0 ? (
                      <p className="mt-1">Optional: {day.activities.join(", ")}</p>
                    ) : null}
                    <p className="type-caption mt-1 text-ink/60">
                      {day.meals} · {day.stay}
                    </p>
                  </>
                ),
              }))}
            />
          </div>
        </div>
        <div className="grid content-start gap-8">
          <div>
            <h3 className="type-h3">Route</h3>
            <div className="mt-3">
              <RouteMap route={itinerary.route} />
            </div>
          </div>
          <div>
            <h3 className="type-h3">Journey profile</h3>
            <div className="mt-3">
              <SafariProfile axes={journeyProfile(draft)} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-ink/15 pt-8">
        <SendToPlanner summary={draftSummary(draft, destinationNames)} />
        <button
          type="button"
          onClick={reset}
          className="type-small mt-4 cursor-pointer underline underline-offset-4 text-ink/70"
        >
          Start over with a blank plan
        </button>
      </div>
    </div>
  );
}

function SendToPlanner({ summary }: { summary: string }) {
  const { draft } = useBuilder();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent"; reference: string } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    setFieldErrors({});
    const travellers = `${draft.adults} adults${draft.children > 0 ? `, ${draft.children} children` : ""}${draft.infants > 0 ? `, ${draft.infants} infants` : ""}`;
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          destination: draft.regions.join(", "),
          travelDates: `${draft.startDate} to ${draft.endDate}`,
          travellers,
          message: `Safari plan from the builder:\n${summary}\n\nPlease turn this into a precise quote.`,
          metadata: { source: "builder", draft },
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        message?: string;
        details?: Record<string, string[]>;
      };
      if (!response.ok || !body.ok || !body.reference) {
        if (body.details) setFieldErrors(body.details);
        setStatus({ kind: "error", message: body.message ?? "Could not send your plan." });
        return;
      }
      setStatus({ kind: "sent", reference: body.reference });
    } catch {
      setStatus({ kind: "error", message: "Network problem — check your connection and try again." });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="max-w-xl rounded-[2px] border border-earth/40 bg-earth/10 px-6 py-6">
        <h3 className="type-h3">Plan sent — thank you.</h3>
        <p className="type-small mt-2 text-ink/75">
          Reference <strong className="type-numeric">{status.reference}</strong>. A planner
          turns this into a precise quote, usually within one business day. Precise
          pricing arrives with the quote — this builder never invents prices.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={(node) => {
        node?.setAttribute("data-ready", "true");
      }}
      onSubmit={onSubmit}
      aria-label="Send plan to a planner"
      className="max-w-xl rounded-[2px] border border-ink/15 bg-parchment px-5 py-5 sm:px-6"
    >
      <h3 className="type-h3">Send this plan to a planner</h3>
      <p className="type-small mt-1 text-ink/70">
        Free, no account needed. Your plan travels with the enquiry as structured data.
      </p>
      {status.kind === "error" ? (
        <div className="mt-3">
          <ErrorState title="Could not send" description={status.message} />
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="plan-name">Full name</Label>
          <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          {fieldErrors["name"]?.[0] ? <FieldError>{fieldErrors["name"][0]}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="plan-email">Email</Label>
          <Input id="plan-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          {fieldErrors["email"]?.[0] ? <FieldError>{fieldErrors["email"][0]}</FieldError> : null}
        </div>
      </div>
      <p className="type-caption mt-3 text-ink/60">
        {tripDays(draft)} days · {draft.destinationSlugs.length} stops · {draft.travelStyle}, {draft.comfort}
      </p>
      <div className="mt-4">
        <Button type="submit" size="lg" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? <Spinner label="Sending" /> : "Request precise quote"}
        </Button>
      </div>
    </form>
  );
}
