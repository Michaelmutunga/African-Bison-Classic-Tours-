"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { FieldError, Label, Textarea, Input } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";

interface Context {
  supplierName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
  offeredCostCents: number | null;
  offeredCurrency: string | null;
  status: string;
  bookingReference: string | null;
  counterOfferCents: number | null;
  expiresAt: string;
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function SupplierResponseView({ token }: { token: string }) {
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/supplier-response/${token}`)
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; message?: string } & Partial<Context>;
        if (!live) return;
        if (!response.ok || !body.ok) {
          setError(body.message ?? "This link is not valid.");
          return;
        }
        setContext(body as Context);
      })
      .catch(() => live && setError("Network problem — check your connection and reload."));
    return () => {
      live = false;
    };
  }, [token]);

  async function respond(action: "accept" | "decline" | "counter") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/supplier-response/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "counter" ? { amountCents: Math.round(Number(amount) * 100), currency: context?.offeredCurrency ?? "USD" } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string; status?: string };
      if (!response.ok || !body.ok) throw new Error(body.message ?? "Reply failed");
      setDone(body.status ?? action);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !context) {
    return (
      <Container className="py-10">
        <ErrorState title="Link unavailable" description={error} />
      </Container>
    );
  }
  if (!context) {
    return (
      <Container className="py-10">
        <p className="type-small" role="status">Loading your request…</p>
      </Container>
    );
  }
  if (done || context.status !== "REQUESTED") {
    return (
      <Container className="py-10">
        <Card>
          <CardBody>
            <h1 className="type-h3">Thank you — reply recorded ({(done ?? context.status).toLowerCase()}).</h1>
            <p className="type-small mt-2 text-ink/70">
              The African Bison team has your answer for {context.serviceName}. This link cannot be used again.
            </p>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="max-w-2xl">
        <p className="type-label text-clay-deep">African Bison Classic Tours · supplier request</p>
        <h1 className="type-h1 mt-2">Can you hold these dates?</h1>
        <Card>
          <CardBody>
            <dl className="type-small grid gap-1.5">
              <div className="flex justify-between gap-2"><dt>Service</dt><dd><strong>{context.serviceName}</strong> ×{context.quantity}</dd></div>
              <div className="flex justify-between gap-2"><dt>Dates</dt><dd>{fmtDay(context.startsAt)} → {fmtDay(context.endsAt)}</dd></div>
              {context.offeredCostCents !== null ? (
                <div className="flex justify-between gap-2"><dt>Rate on file</dt><dd className="type-numeric">{formatMoney(context.offeredCostCents, context.offeredCurrency ?? "USD")}</dd></div>
              ) : null}
              <div className="flex justify-between gap-2"><dt>Reply by</dt><dd>{fmtDay(context.expiresAt)}</dd></div>
            </dl>
            {error ? (
              <div className="mt-3">
                <ErrorState title="Reply failed" description={error} />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="lg" disabled={busy} onClick={() => respond("accept")}>
                {busy ? <Spinner label="Sending" /> : "Accept"}
              </Button>
              <Button size="lg" variant="secondary" disabled={busy} onClick={() => respond("decline")}>
                Decline
              </Button>
            </div>
            <div className="mt-6 border-t border-ink/10 pt-4">
              <h2 className="type-h3">Counter-offer a rate</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="counter-amount">Your rate (major units, {context.offeredCurrency ?? "USD"})</Label>
                  <Input id="counter-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 45" />
                </div>
                <div>
                  <Label htmlFor="counter-note">Note (optional)</Label>
                  <Textarea id="counter-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Includes fuel, excludes park fees" />
                </div>
              </div>
              {amount && !(Number(amount) > 0) ? <FieldError>Enter an amount above zero.</FieldError> : null}
              <div className="mt-2">
                <Button variant="secondary" disabled={busy || !(Number(amount) > 0)} onClick={() => respond("counter")}>
                  {busy ? <Spinner label="Sending" /> : "Send counter-offer"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
