import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listTransfers } from "@/server/operations";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const now = new Date();
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const transfers = await listTransfers(await requestActor(), start, end);

  return (
    <div>
      <h2 className="type-h3">Transfers ({transfers.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        Create transfers from a booking workspace. Status advances there too.
      </p>
      {transfers.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No transfers in range" description="Use ?from=YYYY-MM-DD&to=YYYY-MM-DD to look around." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Transfers">
            <TableHead>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell>Route</TableHeaderCell>
              <TableHeaderCell>Pax</TableHeaderCell>
              <TableHeaderCell>Booking</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHead>
            <TableBody>
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <TableCell>
                    {new Date(transfer.scheduledAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    {transfer.pickup} → {transfer.dropoff}
                  </TableCell>
                  <TableCell numeric>{transfer.passengers}</TableCell>
                  <TableCell>{transfer.booking?.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={transfer.status === "completed" ? "earth" : "neutral"}>{transfer.status}</Badge>
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
