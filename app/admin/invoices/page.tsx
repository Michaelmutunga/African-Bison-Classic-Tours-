import Link from "next/link";
import { FilterBar, StatusTabs } from "@/components/admin/filter-bar";
import { MoneyDual } from "@/components/finance/money-dual";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { getDisplayCurrency } from "@/lib/display-currency";
import { prisma } from "@/lib/prisma";
import { listInvoices } from "@/server/operations";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const actor = await requestActor();
  const [invoices, displayCurrency] = await Promise.all([
    listInvoices(actor, status || undefined),
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
      <FilterBar title="Invoices" count={invoices.length}>
        <StatusTabs
          options={[
            { value: null, label: "All" },
            { value: "DRAFT", label: "Draft" },
            { value: "SENT", label: "Sent" },
            { value: "PAID", label: "Paid" },
            { value: "VOID", label: "Void" },
          ]}
        />
      </FilterBar>
      <p className="type-small text-ink/70">
        Generate from a booking workspace. Totals are billed in the invoice currency; KES is indicative only.
      </p>
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Generate one from any booking workspace." />
      ) : (
        <DataTable caption="Invoices">
          <TableHead>
            <TableHeaderCell>Number</TableHeaderCell>
            <TableHeaderCell>Booking</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <TableCell>{invoice.number}</TableCell>
                <TableCell>
                  <Link href={`/admin/bookings/${invoice.bookingId}`} className="underline underline-offset-4">
                    {invoice.booking.reference}
                  </Link>
                </TableCell>
                <TableCell numeric>
                  <MoneyDual
                    amountCents={invoice.totalCents}
                    currency={invoice.currency}
                    displayCurrency={displayCurrency}
                    rate={rate}
                  />
                </TableCell>
                <TableCell>
                  <Badge tone={invoice.status === "PAID" ? "earth" : "neutral"}>{invoice.status}</Badge>
                </TableCell>
              </tr>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
