import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const TONE = { SENT: "earth", FAILED: "clay", QUEUED: "sand" } as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "bookings.write")) throw new ForbiddenError("bookings.write");
  const { status } = await searchParams;
  const filter = status === "SENT" || status === "FAILED" || status === "QUEUED" ? status : undefined;
  const notifications = await prisma.notification.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h2 className="type-h3">Notifications ({notifications.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        Every dispatch attempt across email, in-app, WhatsApp and SMS. Failures
        never break bookings or payments — they land here with the reason.
      </p>
      {notifications.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nothing sent yet" description="Events land here as they fire." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Notifications">
            <TableHead>
              <TableHeaderCell>Event</TableHeaderCell>
              <TableHeaderCell>Channel</TableHeaderCell>
              <TableHeaderCell>To</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHead>
            <TableBody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <TableCell>{notification.event}</TableCell>
                  <TableCell>{notification.channel.toLowerCase()}</TableCell>
                  <TableCell>{notification.toAddress ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={TONE[notification.status]}>
                      {notification.status}
                      {notification.error ? ` — ${notification.error.slice(0, 60)}` : ""}
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
