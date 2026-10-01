import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { getSupplier, listSupplierLocks } from "@/server/suppliers";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

function lockTone(status: string): "neutral" | "sand" | "earth" | "clay" | "ink" {
  if (status === "CONFIRMED" || status === "COMPLETED") return "earth";
  if (status === "HELD" || status === "REQUESTED") return "sand";
  if (status === "DECLINED") return "clay";
  return "neutral";
}

export default async function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requestActor();
  let supplier;
  try {
    supplier = await getSupplier(actor, id);
  } catch {
    notFound();
  }
  const locks = await listSupplierLocks(actor, { supplierId: id });

  return (
    <div>
      <Link href="/admin/suppliers" className="type-small underline underline-offset-4">
        ← All suppliers
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="type-h3">{supplier.name}</h2>
        <Badge tone={supplier.status === "ACTIVE" ? "earth" : supplier.status === "PAUSED" ? "sand" : "clay"}>
          {supplier.status}
        </Badge>
        {supplier.rating ? <Badge tone="neutral">{supplier.rating}/5 internal rating</Badge> : null}
      </div>
      <p className="type-small mt-1 text-ink/70">
        {[supplier.contactPerson, supplier.phone, supplier.whatsapp, supplier.email]
          .filter(Boolean)
          .join(" · ") || "No contact details yet"}
      </p>
      <p className="type-small mt-1 text-ink/70">
        Covers: {supplier.coverageAreas.join(", ") || "—"} · Types:{" "}
        {supplier.types.map((t) => t.name).join(", ") || "—"}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Rate card (current versions)</h3>
            {supplier.rates.length === 0 ? (
              <p className="type-small mt-2 text-ink/65">No rates yet. Add via POST /api/admin/suppliers/{supplier.id}/rates.</p>
            ) : (
              <div className="mt-2">
                <DataTable caption="Rate card">
                  <TableHead>
                    <TableHeaderCell>Service</TableHeaderCell>
                    <TableHeaderCell>Cost</TableHeaderCell>
                    <TableHeaderCell>Cap.</TableHeaderCell>
                    <TableHeaderCell>Ver.</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {supplier.rates.map((rate) => (
                      <tr key={rate.id}>
                        <TableCell>
                          {rate.serviceName}
                          <span className="type-caption block text-ink/55">
                            {rate.unit.replaceAll("_", " ").toLowerCase()}
                            {rate.season ? ` · ${rate.season} season` : ""}
                            {rate.validTo ? " · closed" : ""}
                          </span>
                        </TableCell>
                        <TableCell>{formatMoney(rate.costCents, rate.currency)}</TableCell>
                        <TableCell>{rate.capacity ?? "—"}</TableCell>
                        <TableCell>v{rate.version}</TableCell>
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
            <h3 className="type-h3">Commitments ({locks.length})</h3>
            {locks.length === 0 ? (
              <p className="type-small mt-2 text-ink/65">Nothing locked for this supplier yet.</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {locks.slice(0, 20).map((lock) => (
                  <li key={lock.id} className="type-small flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                    <span>
                      {lock.serviceName} · {lock.quantity} ×{" "}
                      {new Date(lock.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" → "}
                      {new Date(lock.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {lock.bookingRef ? ` · ${lock.bookingRef}` : ""}
                    </span>
                    <Badge tone={lockTone(lock.status)}>{lock.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {supplier.documents.length > 0 ? (
              <div className="mt-4">
                <h4 className="type-label text-ink/60">Documents</h4>
                <ul className="type-small mt-1">
                  {supplier.documents.map((doc) => (
                    <li key={doc.id}>
                      {doc.kind}: {doc.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
