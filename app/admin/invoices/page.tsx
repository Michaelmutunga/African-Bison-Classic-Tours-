import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { listInvoices } from "@/server/operations";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await listInvoices(await requestActor());
  return (
    <div>
      <h2 className="type-h3">Invoices ({invoices.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        Generate from a booking workspace; advance with the buttons there or PATCH /api/admin/invoices/:id.
      </p>
      {invoices.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No invoices yet" description="Generate one from any booking workspace." />
        </div>
      ) : (
        <div className="mt-4">
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
                  <TableCell numeric>{formatMoney(invoice.totalCents, invoice.currency)}</TableCell>
                  <TableCell>
                    <Badge tone={invoice.status === "PAID" ? "earth" : "neutral"}>{invoice.status}</Badge>
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
