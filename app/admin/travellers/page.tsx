import Link from "next/link";
import { FilterBar, SearchInput } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listTravellers } from "@/server/operations";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function TravellersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const travellers = await listTravellers(await requestActor(), { search: search || undefined });
  return (
    <div className="grid gap-4">
      <FilterBar title="Travellers" count={travellers.length}>
        <SearchInput label="Search travellers" defaultValue={search ?? ""} placeholder="Search by name…" />
      </FilterBar>
      {travellers.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No travellers found" description="Travellers appear once added to bookings." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable caption="Travellers">
            <TableHead>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Passport</TableHeaderCell>
              <TableHeaderCell>Booking</TableHeaderCell>
            </TableHead>
            <TableBody>
              {travellers.map((traveller) => (
                <tr key={traveller.id}>
                  <TableCell>{traveller.fullName}</TableCell>
                  <TableCell>{traveller.kind}</TableCell>
                  <TableCell>
                    <Badge tone={traveller.passportNumber ? "earth" : "sand"}>
                      {traveller.passportNumber ? "On file" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/bookings/${traveller.bookingId}`} className="underline underline-offset-4">
                      {traveller.booking.reference}
                    </Link>
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
