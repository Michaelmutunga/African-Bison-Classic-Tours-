"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Payment, Refund } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ErrorState, Spinner } from "@/components/ui/states";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { convertCents, formatMoney, minorUnitsPerMajor } from "@/lib/money";

export function PayPanel({
  bookingId,
  reference,
  currency,
  totalCents,
  paidCents,
  depositCents,
  payments,
  payable,
}: {
  bookingId: string;
  reference: string;
  currency: string;
  totalCents: number;
  paidCents: number;
  depositCents: number;
  payments: (Payment & { refunds: Refund[] })[];
  payable: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("DEPOSIT");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const balance = Math.max(0, totalCents - paidCents);
  const factor = minorUnitsPerMajor(currency);
  const [kesRate, setKesRate] = useState<{ rateToBase: number; asOf: string } | null>(null);

  useEffect(() => {
    if (currency !== "USD") return;
    fetch("/api/currency-rates")
      .then((res) => res.json())
      .then((body: { rates?: { currency: string; rateToBase: string | number; asOf: string }[] }) => {
        const kes = body.rates?.find((rate) => rate.currency === "KES");
        if (kes) setKesRate({ rateToBase: Number(kes.rateToBase), asOf: kes.asOf });
      })
      .catch(() => undefined);
  }, [currency]);

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amountCents: Math.round(Number(amount) * factor),
          kind,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        payment?: { id: string };
      };
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Could not start the payment.");
        setSending(false);
        return;
      }
      setNotice(
        "Payment started with our test provider. It confirms asynchronously — refresh in a moment, or pay the same amount again is safe (idempotency keys prevent doubles).",
      );
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Payment summary">
        <div className="rounded-[2px] border border-ink/15 px-4 py-3">
          <p className="type-label text-ink/60">Total</p>
          <p className="type-h3 type-numeric">{formatMoney(totalCents, currency)}</p>
        </div>
        <div className="rounded-[2px] border border-ink/15 px-4 py-3">
          <p className="type-label text-ink/60">Paid</p>
          <p className="type-h3 type-numeric">{formatMoney(paidCents, currency)}</p>
        </div>
        <div className="rounded-[2px] border border-ink/15 px-4 py-3">
          <p className="type-label text-ink/60">Balance</p>
          <p className="type-h3 type-numeric">{formatMoney(balance, currency)}</p>
          {currency === "USD" && kesRate ? (
            <p className="type-caption mt-1 text-ink/60">
              ≈ {formatMoney(convertCents(balance, 1, kesRate.rateToBase), "KES")} · indicative
              M-Pesa reference, billed in USD
            </p>
          ) : null}
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="mt-4">
          <DataTable caption="Payments">
            <TableHead>
              <TableHeaderCell>Kind</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Receipt</TableHeaderCell>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <TableCell>{payment.kind.toLowerCase()}</TableCell>
                  <TableCell numeric>{formatMoney(payment.amountCents, payment.currency)}</TableCell>
                  <TableCell>{payment.status.toLowerCase()}</TableCell>
                  <TableCell>
                    {payment.status === "SUCCEEDED" ? (
                      <Link
                        href={`/api/payments/${payment.id}/receipt`}
                        className="underline underline-offset-4"
                      >
                        Receipt
                      </Link>
                    ) : (
                      <span className="text-ink/50">—</span>
                    )}
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </DataTable>
        </div>
      ) : (
        <p className="type-small mt-4 text-ink/70">No payments yet.</p>
      )}

      {payable && balance > 0 ? (
        <form
          ref={(node) => {
            node?.setAttribute("data-ready", "true");
          }}
          onSubmit={pay}
          className="mt-5 max-w-md rounded-[2px] border border-ink/15 p-4"
          aria-label="Make a payment"
        >
          <h3 className="type-h3">Make a payment</h3>
          {error ? (
            <div className="mt-3">
              <ErrorState title="Payment not started" description={error} />
            </div>
          ) : null}
          {notice ? (
            <p role="status" className="type-small mt-3 rounded-[2px] bg-earth/10 px-3 py-2">
              {notice}
            </p>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`pay-amount-${reference}`}>Amount ({currency})</Label>
              <Input
                id={`pay-amount-${reference}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(balance / factor)}
                required
              />
            </div>
            <div>
              <Label htmlFor={`pay-kind-${reference}`}>For</Label>
              <Select id={`pay-kind-${reference}`} value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="DEPOSIT">Deposit ({formatMoney(depositCents, currency)})</option>
                <option value="BALANCE">Balance</option>
                <option value="FULL">Full amount</option>
              </Select>
            </div>
          </div>
          <Button type="submit" className="mt-3" disabled={sending}>
            {sending ? <Spinner label="Starting" /> : "Pay now"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
