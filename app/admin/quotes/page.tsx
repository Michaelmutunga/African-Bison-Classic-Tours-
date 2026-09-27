import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { listQuotes } from "@/server/pricing";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await listQuotes(await requestActor());
  return (
    <div>
      <h2 className="type-h3">Quotes ({quotes.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        Quotes are created via the API today; the visual quote builder lands with the planner workflow.
      </p>
      {quotes.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No quotes yet" description="Create one with POST /api/admin/quotes." />
        </div>
      ) : (
        <div className="mt-4">
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
                  <TableCell numeric>{formatMoney(quote.totalCents, quote.currency)}</TableCell>
                  <TableCell>
                    <Badge tone={quote.status === "ACCEPTED" ? "earth" : "neutral"}>{quote.status}</Badge>
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
