import { notFound } from "next/navigation";
import { DetailHeader } from "@/components/admin/detail-header";
import { MoneyDual } from "@/components/finance/money-dual";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/display-currency";
import { prisma } from "@/lib/prisma";
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
  const displayCurrency = await getDisplayCurrency();
  const kesRate = await prisma.currencyRate
    .findUnique({ where: { currency: "KES" } })
    .catch(() => null);
  const rate = kesRate
    ? { rateToBase: Number(kesRate.rateToBase), asOf: kesRate.asOf.toISOString() }
    : null;

  return (
    <div className="grid max-w-3xl gap-4">
      <DetailHeader
        eyebrow="Quote"
        title={quote.number}
        status={quote.status}
        meta={`${quote.customerEmail ?? quote.customerName ?? "No customer"} · valid until ${new Date(quote.validUntil).toLocaleDateString("en-GB")}`}
        actions={
          quote.status === "ACCEPTED" ? (
            <ButtonLink href={`/admin/bookings?status=QUOTE_SENT`} size="sm" variant="secondary">
              Open pipeline
            </ButtonLink>
          ) : undefined
        }
      />
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
        <strong className="type-numeric">
          <MoneyDual
            amountCents={quote.totalCents}
            currency={quote.currency}
            displayCurrency={displayCurrency}
            rate={rate}
          />
        </strong>{" "}
        · deposit {formatMoney(quote.depositCents, quote.currency)}
      </p>
      <p className="type-caption text-ink/60">
        Billed in {quote.currency}. KES is an indicative display conversion only; converting the
        billed currency requires a new quote via the pricing engine. Convert via
        POST /api/admin/bookings from an accepted quote.
      </p>
    </div>
  );
}
