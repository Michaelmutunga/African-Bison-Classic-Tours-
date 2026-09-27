import Link from "next/link";
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
    <div>
      <h2 className="type-h3">Travellers ({travellers.length})</h2>
      <form method="get" className="type-small mt-2 flex gap-2" aria-label="Search travellers">
        <input
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search by name…"
          className="rounded-[2px] border border-ink/20 bg-ivory px-3 py-1.5"
        />
        <button type="submit" className="cursor-pointer underline underline-offset-4">Search</button>
      </form>
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
                  <TableCell>{traveller.passportNumber ? "On file" : "Pending"}</TableCell>
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
