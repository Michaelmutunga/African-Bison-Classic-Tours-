"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FieldError, Label, Textarea } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";

interface QuoteVersionView {
  version: number;
  status: string;
  currency: string;
  lines: { seq: number; serviceName: string; quantity: number; totalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  taxTotalCents: number;
  totalCents: number;
  depositCents: number;
  validUntil: string;
  paymentTerms: string | null;
  cancellationTerms: string | null;
  notes: string | null;
}

function money(cents: number, currency: string): string {
  try {
    return formatMoney(cents, currency);
  } catch {
    return `${cents}`;
  }
}

export function ClientQuote({ reference }: { reference: string }) {
  const [quote, setQuote] = useState<QuoteVersionView | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/account/bookings/${reference}/quote`)
      .then(async (response) => {
        if (!live) return;
        if (response.status === 404) {
          setMissing(true);
          return;
        }
        const body = (await response.json()) as { ok?: boolean; version?: QuoteVersionView };
        if (body.ok && body.version) setQuote(body.version);
        else setMissing(true);
      })
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [reference]);

  async function act(action: "accept" | "revise") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/account/bookings/${reference}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "revise" ? { action, comments } : { action }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message ?? "Request failed");
      setDone(action === "accept" ? "accepted" : "revised");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (missing) return null;
  if (done === "accepted") {
    return (
      <Card>
        <CardBody>
          <h2 className="type-h3">Quote accepted — thank you.</h2>
          <p className="type-small mt-2 text-ink/70">
            Your planner now takes the deposit ({quote ? money(quote.depositCents, quote.currency) : ""}) to
            confirm every supplier. Watch your email for the payment link.
          </p>
        </CardBody>
      </Card>
    );
  }
  if (done === "revised") {
    return (
      <Card>
        <CardBody>
          <h2 className="type-h3">Changes sent.</h2>
          <p className="type-small mt-2 text-ink/70">
            Your planner will rework the quote and send a fresh version — usually within one business day.
          </p>
        </CardBody>
      </Card>
    );
  }
  if (!quote) {
    return (
      <p className="type-small text-ink/60" role="status">
        Checking for your quote…
      </p>
    );
  }

  return (
    <Card>
      <CardBody>
        <p className="type-label text-clay-deep">Your quote · Q{quote.version}</p>
        <h2 className="type-h3 mt-1">Safari quote {reference}-Q{quote.version}</h2>
        <ul className="type-small mt-3 grid gap-1.5">
          {quote.lines.map((line) => (
            <li key={line.seq} className="flex justify-between gap-2">
              <span>{line.serviceName} ×{line.quantity}</span>
              <span className="type-numeric">{money(line.totalCents, quote.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="type-small mt-3 grid gap-1 border-t border-ink/10 pt-3">
          <div className="flex justify-between gap-2"><dt>Subtotal</dt><dd className="type-numeric">{money(quote.subtotalCents, quote.currency)}</dd></div>
          {quote.discountCents > 0 ? (
            <div className="flex justify-between gap-2"><dt>Discount</dt><dd className="type-numeric">−{money(quote.discountCents, quote.currency)}</dd></div>
          ) : null}
          {quote.taxTotalCents > 0 ? (
            <div className="flex justify-between gap-2"><dt>Taxes & fees</dt><dd className="type-numeric">{money(quote.taxTotalCents, quote.currency)}</dd></div>
          ) : null}
          <div className="flex justify-between gap-2"><dt><strong>Total</strong></dt><dd className="type-numeric"><strong>{money(quote.totalCents, quote.currency)}</strong></dd></div>
          <div className="flex justify-between gap-2"><dt>Deposit to confirm</dt><dd className="type-numeric">{money(quote.depositCents, quote.currency)}</dd></div>
        </dl>
        <p className="type-caption mt-2 text-ink/60">
          Valid until {new Date(quote.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
          {quote.paymentTerms ? ` ${quote.paymentTerms}` : ""}
        </p>
        {quote.notes ? <p className="type-small mt-2 text-ink/75">{quote.notes}</p> : null}
        {error ? (
          <div className="mt-3">
            <ErrorState title="Could not send" description={error} />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="lg" disabled={busy} onClick={() => act("accept")}>
            {busy ? <Spinner label="Accepting" /> : `Accept — ${money(quote.totalCents, quote.currency)}`}
          </Button>
        </div>
        <div className="mt-4">
          <Label htmlFor={`revision-${reference}`}>Need changes? Tell us what to adjust</Label>
          <Textarea
            id={`revision-${reference}`}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="e.g. Swap the last night to a mid-range camp and add the balloon flight…"
          />
          {comments.trim().length > 0 && comments.trim().length < 10 ? (
            <FieldError>A few more words help (10+ characters).</FieldError>
          ) : null}
          <div className="mt-2">
            <Button variant="secondary" disabled={busy || comments.trim().length < 10} onClick={() => act("revise")}>
              {busy ? <Spinner label="Sending" /> : "Request changes"}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
