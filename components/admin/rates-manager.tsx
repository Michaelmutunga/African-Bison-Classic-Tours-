"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";

export type RateRow = {
  currency: string;
  rateToBase: string;
  asOf: string;
};

/** Currency rates editor. Writes via POST /api/admin/currency-rates, audited server-side. */
export function RatesManager({ initial }: { initial: RateRow[] }) {
  const router = useRouter();
  const [currency, setCurrency] = useState("KES");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Render must stay pure (react-hooks/purity): read the clock through
  // useSyncExternalStore so SSR renders a stable value and the client
  // hydrates without impure calls during render.
  const now = useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => 0,
  );

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/currency-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, rateToBase: Number(rate) }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message ?? "Could not save rate.");
      setRate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {initial.length === 0 ? (
        <p className="type-small text-ink/70">
          No rates configured. Quotes in KES, EUR or GBP will fail until a rate exists. Base is USD
          (1.00).
        </p>
      ) : (
        <ul className="type-small grid gap-1.5">
          {initial.map((row) => {
            const stale = now > 0 && now - new Date(row.asOf).getTime() > 30 * 86_400_000;
            return (
              <li key={row.currency} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <strong>1 USD = {row.rateToBase} {row.currency}</strong>{" "}
                  <span className="type-caption text-ink/60">
                    · {new Date(row.asOf).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {stale ? " · stale, review" : ""}
                  </span>
                </span>
                <span className="type-caption text-ink/60">
                  e.g. $1,000 ≈ {formatMoney(0, row.currency).replace(/[\d.,\s]+$/, "").trim()} {row.currency}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={save} aria-label="Update currency rate" className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="rate-currency">Currency</Label>
          <Input
            id="rate-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            required
            maxLength={3}
          />
        </div>
        <div>
          <Label htmlFor="rate-value">Units per 1 USD (e.g. 129 for KES)</Label>
          <Input
            id="rate-value"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="129"
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={busy || !rate}>
          {busy ? <Spinner label="Saving" /> : "Save rate"}
        </Button>
      </form>
      {error ? (
        <div className="mt-3">
          <ErrorState title="Rate not saved" description={error} />
        </div>
      ) : null}
      <p className="type-caption mt-2 text-ink/60">
        Display conversions use this rate and always show the date. Stored totals never change.
      </p>
    </div>
  );
}
