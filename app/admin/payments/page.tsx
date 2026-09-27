import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { listPayments } from "@/server/payments";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await listPayments(await requestActor());
  return (
    <div>
      <h2 className="type-h3">Payments ({payments.length})</h2>
      {payments.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No payments yet" description="Payments appear here once guests start paying." />
        </div>
      ) : (
        <div className="mt-4">
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
                  <TableCell numeric>{formatMoney(payment.amountCents, payment.currency)}</TableCell>
                  <TableCell>{payment.provider}</TableCell>
                  <TableCell>
                    <Badge tone={payment.status === "SUCCEEDED" ? "earth" : "neutral"}>{payment.status}</Badge>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}
