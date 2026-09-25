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

export function InquiryForm({ tourSlug, tourTitle }: { tourSlug?: string; tourTitle?: string }) {
  const tour = tourSlug ? { slug: tourSlug, title: tourTitle ?? tourSlug } : undefined;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // Signals React hydration via ref (no setState-in-effect): the submit
  // handler only exists client-side, so automated checks can wait for the
  // live form before clicking.
  function markReady(node: HTMLFormElement | null) {
    node?.setAttribute("data-ready", "true");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/inquiries", {
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
        setStatus({
          kind: "error",
          message: body.message ?? "Something went wrong sending your enquiry.",
        });
        return;
      }
      setStatus({ kind: "sent", reference: body.reference });
    } catch {
      setStatus({
        kind: "error",
        message: "Network problem — check your connection and try again.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-[2px] border border-earth/40 bg-earth/10 px-6 py-8">
        <p className="type-h3">Enquiry received — thank you.</p>
        <p className="type-small mt-2 text-ink/75">
          Your reference is <strong className="type-numeric">{status.reference}</strong>. A
          safari planner will reply by email, usually within one business day.
        </p>
      </div>
    );
  }

  const errorFor = (name: string) => fieldErrors[name]?.[0];

  return (
    <form ref={markReady} onSubmit={onSubmit} noValidate aria-label="Safari enquiry form">
      {status.kind === "error" ? (
        <div className="mb-4">
          <ErrorState title="Could not send" description={status.message} />
        </div>
      ) : null}
      {tour ? (
        <p className="type-small mb-4 rounded-[2px] bg-sand/40 px-4 py-3">
          Enquiring about: <strong>{tour.title}</strong>
        </p>
      ) : null}
      <input type="hidden" name="tourSlug" value={tourSlug ?? ""} />
      {/* Honeypot — hidden from humans, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!errorFor("name")} />
          {errorFor("name") ? <FieldError>{errorFor("name")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!errorFor("email")}
          />
          {errorFor("email") ? <FieldError>{errorFor("email")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="phone">Phone / WhatsApp</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" autoComplete="country-name" />
        </div>
        <div>
          <Label htmlFor="destination">Where do you want to go?</Label>
          <Input
            id="destination"
            name="destination"
            placeholder="e.g. Maasai Mara + Serengeti"
          />
        </div>
        <div>
          <Label htmlFor="travelDates">Travel dates</Label>
          <Input id="travelDates" name="travelDates" placeholder="e.g. 12–24 August 2027" />
        </div>
        <div>
          <Label htmlFor="travellers">Travellers</Label>
          <Input id="travellers" name="travellers" placeholder="e.g. 2 adults, 1 child" />
        </div>
        <div>
          <Label htmlFor="preferredContact">Preferred contact</Label>
          <Select id="preferredContact" name="preferredContact" defaultValue="email">
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="message">Your trip</Label>
        <Textarea
          id="message"
          name="message"
          required
          aria-invalid={!!errorFor("message")}
          aria-describedby="message-hint"
          placeholder="Destinations, pace, accommodation style, budget range, anything else…"
        />
        <FieldHint id="message-hint">The more detail, the better your itinerary.</FieldHint>
        {errorFor("message") ? <FieldError>{errorFor("message")}</FieldError> : null}
      </div>
      <div className="mt-5">
        <Button type="submit" size="lg" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? <Spinner label="Sending" /> : "Send enquiry"}
        </Button>
      </div>
    </form>
  );
}
