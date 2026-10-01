import Link from "next/link";
import { FilterBar, StatusTabs } from "@/components/admin/filter-bar";
import { MoneyDual } from "@/components/finance/money-dual";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { getDisplayCurrency } from "@/lib/display-currency";
import { prisma } from "@/lib/prisma";
import { listQuotes } from "@/server/pricing";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const actor = await requestActor();
  const [quotes, displayCurrency] = await Promise.all([
    listQuotes(actor, (status as "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | undefined) || undefined),
    getDisplayCurrency(),
  ]);
  const kesRate = await prisma.currencyRate
    .findUnique({ where: { currency: "KES" } })
    .catch(() => null);
  const rate = kesRate
    ? { rateToBase: Number(kesRate.rateToBase), asOf: kesRate.asOf.toISOString() }
    : null;
  return (
    <div className="grid gap-4">
      <FilterBar title="Quotes" count={quotes.length}>
        <StatusTabs
          options={[
            { value: null, label: "All" },
            { value: "DRAFT", label: "Draft" },
            { value: "SENT", label: "Sent" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "EXPIRED", label: "Expired" },
          ]}
        />
      </FilterBar>
      <p className="type-small text-ink/70">
        Quotes hold a pricing snapshot. Open one to review lines, then convert an accepted quote to a booking.
      </p>
      {quotes.length === 0 ? (
        <EmptyState title="No quotes yet" description="Quotes appear here once a planner prices a journey." />
      ) : (
        <DataTable caption="Quotes">
          <TableHead>
            <TableHeaderCell>Number</TableHeaderCell>
            <TableHeaderCell>Customer</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHead>
          <TableBody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <TableCell>
                  <Link href={`/admin/quotes/${quote.id}`} className="underline underline-offset-4">
                    {quote.number}
                  </Link>
                </TableCell>
                <TableCell>{quote.customerEmail ?? quote.customerName ?? "—"}</TableCell>
                <TableCell numeric>
                  <MoneyDual
                    amountCents={quote.totalCents}
                    currency={quote.currency}
                    displayCurrency={displayCurrency}
                    rate={rate}
                  />
                </TableCell>
                <TableCell>
                  <Badge tone={quote.status === "ACCEPTED" ? "earth" : "neutral"}>{quote.status}</Badge>
                </TableCell>
              </tr>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
