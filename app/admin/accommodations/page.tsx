import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listAccommodations } from "@/server/catalogue";
import { currentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AccommodationsPage() {
  const user = await currentUser();
  const canWrite = hasPermission(user?.role, "catalogue.write");
  const stays = await listAccommodations();
  return (
    <div className="grid gap-4">
      <FilterBar title="Accommodation" count={stays.length} />
      <p className="type-small text-ink/70">
        Properties, room types and board basis. {canWrite ? "Managed through the catalogue API." : "Read-only for your role."}
      </p>
      {stays.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No properties yet" description="Add the lodges and camps you actually sell." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Accommodation">
            <TableHead>
              <TableHeaderCell>Property</TableHeaderCell>
              <TableHeaderCell>Location</TableHeaderCell>
              <TableHeaderCell>Rooms</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHead>
            <TableBody>
              {stays.map((stay) => (
                <tr key={stay.id}>
                  <TableCell>
                    {stay.name}
                    <span className="type-caption block text-ink/55">{stay.category ?? ""} {stay.boardBasis ?? ""}</span>
                  </TableCell>
                  <TableCell>{stay.location ?? "—"}</TableCell>
                  <TableCell>
                    {stay.roomTypes.length === 0
                      ? "—"
                      : stay.roomTypes.map((room) => `${room.name}${room.capacity ? ` (${room.capacity}pax)` : ""}`).join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge tone={stay.status === "active" ? "earth" : "neutral"}>{stay.status}</Badge>
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
