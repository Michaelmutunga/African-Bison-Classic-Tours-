import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { formatPct } from "@/server/marketplace-pricing";
import {
  funnelReport,
  incomePerBooking,
  incomePerMonth,
  incomePerServiceType,
  incomePerSupplier,
  outstandingClients,
  outstandingPayouts,
} from "@/server/reports";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

function splitsCell(splits: { currency: string; amountCents: number; marginBps?: number }[]) {
  if (splits.length === 0) return <span className="text-ink/55">—</span>;
  return (
    <span>
      {splits.map((split) => (
        <span key={split.currency} className="type-numeric block">
          {split.currency} {formatMoney(split.amountCents, split.currency)}
          {split.marginBps !== undefined ? ` (${formatPct(split.marginBps)})` : ""}
        </span>
      ))}
    </span>
  );
}

const incomeCell = (splits: { currency: string; incomeCents: number; marginBps: number }[]) =>
  splitsCell(splits.map((s) => ({ currency: s.currency, amountCents: s.incomeCents, marginBps: s.marginBps })));

export default async function AdminReportsPage() {
  const actor = await requestActor();
  const [byBooking, byMonth, bySupplier, byType, clients, payouts, funnel] = await Promise.all([
    incomePerBooking(actor, {}),
    incomePerMonth(actor, {}),
    incomePerSupplier(actor, {}),
    incomePerServiceType(actor, {}),
    outstandingClients(actor),
    outstandingPayouts(actor),
    funnelReport(actor, {}),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="type-h3">Reports</h2>
        <p className="type-small mt-1 text-ink/70">
          Live figures from bookings, service lines and payouts — never summed across
          currencies. Finance roles only.
        </p>
      </div>

      <section aria-label="Pipeline">
        <div className="flex flex-wrap gap-2">
          <Badge tone="sand">Submitted · {funnel.submitted}</Badge>
          <Badge tone="earth">Confirmed · {funnel.confirmed}</Badge>
          <Badge tone="ink">Conversion · {funnel.conversionPct}%</Badge>
          <Badge tone="neutral">
            Avg. time to quote · {funnel.avgHoursToQuote === null ? "—" : `${funnel.avgHoursToQuote}h`}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Income per month</h3>
            {byMonth.length === 0 ? (
              <div className="mt-2"><EmptyState title="No income yet" description="Costed service lines appear here." /></div>
            ) : (
              <div className="mt-2">
                <DataTable caption="Income per month">
                  <TableHead>
                    <TableHeaderCell>Month</TableHeaderCell>
                    <TableHeaderCell>Pipeline income</TableHeaderCell>
                    <TableHeaderCell>Realised income</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {byMonth.map((row) => (
                      <tr key={row.month}>
                        <TableCell>{row.month}</TableCell>
                        <TableCell>{incomeCell(row.pipeline)}</TableCell>
                        <TableCell>{incomeCell(row.realised)}</TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Income per supplier</h3>
            {bySupplier.length === 0 ? (
              <div className="mt-2"><EmptyState title="No income yet" description="Costed service lines appear here." /></div>
            ) : (
              <div className="mt-2">
                <DataTable caption="Income per supplier">
                  <TableHead>
                    <TableHeaderCell>Supplier</TableHeaderCell>
                    <TableHeaderCell>Lines</TableHeaderCell>
                    <TableHeaderCell>Income (margin)</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {bySupplier.map((row) => (
                      <tr key={row.supplierId ?? "unassigned"}>
                        <TableCell>{row.supplierName}</TableCell>
                        <TableCell>{row.lines}</TableCell>
                        <TableCell>{incomeCell(row.splits)}</TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Income per service type</h3>
            <div className="mt-2">
              <DataTable caption="Income per service type">
                <TableHead>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Lines</TableHeaderCell>
                  <TableHeaderCell>Income (margin)</TableHeaderCell>
                </TableHead>
                <TableBody>
                  {byType.map((row) => (
                    <tr key={row.serviceType}>
                      <TableCell>{row.serviceType}</TableCell>
                      <TableCell>{row.lines}</TableCell>
                      <TableCell>{incomeCell(row.splits)}</TableCell>
                    </tr>
                  ))}
                </TableBody>
              </DataTable>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Outstanding client payments ({clients.length})</h3>
            {clients.length === 0 ? (
              <p className="type-small mt-2 text-ink/60">Nothing outstanding.</p>
            ) : (
              <ul className="type-small mt-2 grid gap-1.5">
                {clients.slice(0, 15).map((row) => (
                  <li key={row.bookingId} className="flex flex-wrap justify-between gap-2 border-b border-ink/10 pb-1.5">
                    <Link href={`/admin/bookings/${row.bookingId}`} className="underline underline-offset-4">
                      {row.reference}
                    </Link>
                    <span className="type-numeric">{formatMoney(row.outstandingCents, row.currency)} of {formatMoney(row.pricedCents, row.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="type-h3 mt-5">Outstanding supplier payouts ({payouts.length})</h3>
            {payouts.length === 0 ? (
              <p className="type-small mt-2 text-ink/60">Nothing due.</p>
            ) : (
              <ul className="type-small mt-2 grid gap-1.5">
                {payouts.map((row) => (
                  <li key={row.supplierId} className="flex flex-wrap justify-between gap-2 border-b border-ink/10 pb-1.5">
                    <span>{row.supplierName} · {row.payouts} payout{row.payouts === 1 ? "" : "s"}</span>
                    {splitsCell(row.splits.map((s) => ({ currency: s.currency, amountCents: s.dueCents })))}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="type-h3">Income per booking ({byBooking.length})</h3>
          <div className="mt-2">
            <DataTable caption="Income per booking">
              <TableHead>
                <TableHeaderCell>Booking</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Income (margin)</TableHeaderCell>
              </TableHead>
              <TableBody>
                {byBooking.slice(0, 50).map((row) => (
                  <tr key={row.bookingId}>
                    <TableCell>
                      <Link href={`/admin/bookings/${row.bookingId}`} className="underline underline-offset-4">
                        {row.reference}
                      </Link>
                      <span className="type-caption block text-ink/55">{row.customerName} · {row.lines} lines</span>
                    </TableCell>
                    <TableCell>{row.status.replaceAll("_", " ")}</TableCell>
                    <TableCell>{incomeCell(row.splits)}</TableCell>
                  </tr>
                ))}
              </TableBody>
            </DataTable>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
