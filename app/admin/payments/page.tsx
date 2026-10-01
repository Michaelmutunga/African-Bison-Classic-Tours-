import Link from "next/link";
import { FilterBar } from "@/components/admin/filter-bar";
import { MoneyDual } from "@/components/finance/money-dual";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { getDisplayCurrency } from "@/lib/display-currency";
import { prisma } from "@/lib/prisma";
import { listPayments } from "@/server/payments";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, displayCurrency] = await Promise.all([
    listPayments(await requestActor()),
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
      <FilterBar title="Payments" count={payments.length} />
      {payments.length === 0 ? (
        <EmptyState title="No payments yet" description="Payments appear here once guests start paying." />
      ) : (
        <DataTable caption="Payments">
          <TableHead>
            <TableHeaderCell>Booking</TableHeaderCell>
            <TableHeaderCell>Kind</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Provider</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <TableCell>
                  <Link href={`/admin/bookings/${payment.bookingId}`} className="underline underline-offset-4">
                    {payment.booking.reference}
                  </Link>
                </TableCell>
                <TableCell>{payment.kind.toLowerCase()}</TableCell>
                <TableCell numeric>
                  <MoneyDual
                    amountCents={payment.amountCents}
                    currency={payment.currency}
                    displayCurrency={displayCurrency}
                    rate={rate}
                  />
                </TableCell>
                <TableCell>{payment.provider}</TableCell>
                <TableCell>
                  <Badge tone={payment.status === "SUCCEEDED" ? "earth" : "neutral"}>{payment.status}</Badge>
                </TableCell>
              </tr>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
