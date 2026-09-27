import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { listActivities } from "@/server/catalogue";
import { currentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const user = await currentUser();
  const canWrite = hasPermission(user?.role, "catalogue.write");
  const activities = await listActivities(false);
  return (
    <div>
      <h2 className="type-h3">Activities ({activities.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        {canWrite ? "Manage via POST/PATCH /api/admin/activities." : "Read-only for your role."}
      </p>
      {activities.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No activities yet" description="Balloon flights, village visits, boat rides…" />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Activities">
            <TableHead>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Destination</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHead>
            <TableBody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <TableCell>{activity.name}</TableCell>
                  <TableCell>{activity.destination ?? "—"}</TableCell>
                  <TableCell numeric>
                    {activity.priceCents !== null && activity.priceCents !== undefined
                      ? formatMoney(activity.priceCents, activity.currency)
                      : "On request"}
                  </TableCell>
                  <TableCell>
                    <Badge tone={activity.published ? "earth" : "neutral"}>
                      {activity.published ? "Published" : "Draft"}
                    </Badge>
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
