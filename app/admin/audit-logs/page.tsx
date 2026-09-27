import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listAuditLogs } from "@/server/operations";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ resource?: string }>;
}) {
  const { resource } = await searchParams;
  const logs = await listAuditLogs(await requestActor(), { resource: resource || undefined });
  return (
    <div>
      <h2 className="type-h3">Audit log ({logs.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        Immutable record of who did what. Secrets are never written here.
      </p>
      {logs.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No audit entries yet" description="Staff actions land here as they happen." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Audit log">
            <TableHead>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Resource</TableHeaderCell>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{log.actor}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    {log.resource}
                    {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ""}
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
