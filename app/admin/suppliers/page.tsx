import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listSuppliers } from "@/server/suppliers";
import { requestActor } from "@/server/http";
import type { SupplierStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE = { ACTIVE: "earth", PAUSED: "sand", BLACKLISTED: "clay" } as const;

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status, search } = await searchParams;
  const actor = await requestActor();
  const suppliers = await listSuppliers(actor, {
    status: (status as SupplierStatus) || undefined,
    search,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-h3">Suppliers ({suppliers.length})</h2>
          <p className="type-small mt-1 text-ink/70">
            Contractors who fulfil every booking. Payout details are encrypted and
            never shown here — finance reveals them per supplier.
          </p>
        </div>
        <form method="get" role="search" className="flex items-center gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="supplier-search" className="sr-only">
            Search suppliers
          </label>
          <input
            id="supplier-search"
            name="search"
            type="search"
            defaultValue={search ?? ""}
            placeholder="Search name, area, email…"
            autoComplete="off"
            className="type-small w-64 border border-ink/15 bg-transparent px-3 py-2 placeholder:text-ink/40 focus:border-ink/40 focus:outline-none"
          />
          <button type="submit" className="type-small underline underline-offset-4">
            Search
          </button>
          <Link href="/admin/suppliers" className="type-small underline underline-offset-4">
            Clear
          </Link>
        </form>
      </div>
      {suppliers.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No suppliers"
            description="Register your transfer operators, lodges, guides and activity providers first."
          />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Suppliers">
            <TableHead>
              <TableHeaderCell>Supplier</TableHeaderCell>
              <TableHeaderCell>Types</TableHeaderCell>
              <TableHeaderCell>Coverage</TableHeaderCell>
              <TableHeaderCell>Rating</TableHeaderCell>
              <TableHeaderCell>Payout</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHead>
            <TableBody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <TableCell>
                    <Link href={`/admin/suppliers/${supplier.id}`} className="font-semibold hover:text-clay-deep">
                      {supplier.name}
                    </Link>
                    <span className="type-caption block text-ink/55">
                      {supplier.contactPerson ?? ""} {supplier.phone ?? ""}
                    </span>
                  </TableCell>
                  <TableCell>{supplier.types.map((t) => t.name).join(", ") || "—"}</TableCell>
                  <TableCell>{supplier.coverageAreas.join(", ") || "—"}</TableCell>
                  <TableCell>{supplier.rating ? `${supplier.rating}/5` : "—"}</TableCell>
                  <TableCell>{supplier.payoutHint ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={STATUS_TONE[supplier.status]}>{supplier.status}</Badge>
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
