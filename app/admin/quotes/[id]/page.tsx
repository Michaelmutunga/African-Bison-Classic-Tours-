import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { getQuote } from "@/server/pricing";
import { requestActor } from "@/server/http";
import { NotFoundError } from "@/server/catalogue";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let quote;
  try {
    quote = await getQuote(await requestActor(), id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const snapshot = quote.snapshot as {
    resolved?: { seasonSlug?: string | null };
    totals?: { subtotalCents?: number; discountCents?: number; totalCents?: number; depositCents?: number };
  } | null;

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-h3">{quote.number}</h2>
        <Badge tone="sand">{quote.status}</Badge>
      </div>
      <Card>
        <CardBody>
          <dl className="type-small grid gap-1">
            <div className="flex justify-between gap-2"><dt>Customer</dt><dd>{quote.customerEmail ?? quote.customerName ?? "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt>Tour</dt><dd>{quote.tour?.title ?? "Custom"}</dd></div>
            <div className="flex justify-between gap-2"><dt>Valid until</dt><dd>{new Date(quote.validUntil).toLocaleDateString("en-GB")}</dd></div>
            <div className="flex justify-between gap-2"><dt>Season</dt><dd>{snapshot?.resolved?.seasonSlug ?? "standard"}</dd></div>
            {quote.hasPlaceholderRates ? (
              <div className="flex justify-between gap-2"><dt>Rates</dt><dd className="text-clay-deep">Indicative — placeholder rates</dd></div>
            ) : null}
          </dl>
        </CardBody>
      </Card>
      <DataTable caption="Quote lines">
        <TableHead>
          <TableHeaderCell>Line</TableHeaderCell>
          <TableHeaderCell>Qty</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
        </TableHead>
        <TableBody>
          {quote.items.map((item) => (
            <tr key={item.id}>
              <TableCell>{item.label}</TableCell>
              <TableCell numeric>{item.quantity}</TableCell>
              <TableCell numeric>{formatMoney(item.totalCents, quote.currency)}</TableCell>
            </tr>
          ))}
        </TableBody>
      </DataTable>
      <p className="type-small text-ink/70">
        Subtotal {formatMoney(quote.subtotalCents, quote.currency)} · discount{" "}
        {formatMoney(quote.discountCents, quote.currency)} · total{" "}
        <strong className="type-numeric">{formatMoney(quote.totalCents, quote.currency)}</strong> · deposit{" "}
        {formatMoney(quote.depositCents, quote.currency)}
      </p>
      <p className="type-caption text-ink/60">
        Status changes via PATCH /api/admin/quotes/{quote.id} — transitions are validated server-side.
      </p>
    </div>
  );
}
