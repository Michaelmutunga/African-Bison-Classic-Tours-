import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, "inquiries.read")) throw new ForbiddenError("inquiries.read");
  const inquiries = await prisma.contactInquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="grid gap-4">
      <FilterBar title="Enquiries" count={inquiries.length} />
      <p className="type-small text-ink/70">
        {inquiries.length >= 100 ? "Showing latest 100. " : ""}Advance status from the enquiry workflow, then convert strong ones into quotes.
      </p>
      {inquiries.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No enquiries yet" description="Public forms land here." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Enquiries">
            <TableHead>
              <TableHeaderCell>Reference</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Destination</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHead>
            <TableBody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <TableCell>{inquiry.reference}</TableCell>
                  <TableCell>
                    {inquiry.name}
                    <span className="type-caption block text-ink/55">{inquiry.email}</span>
                  </TableCell>
                  <TableCell>{inquiry.destination ?? "—"}</TableCell>
                  <TableCell>
                    <Badge tone={inquiry.status === "new" ? "clay" : "neutral"}>{inquiry.status}</Badge>
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
