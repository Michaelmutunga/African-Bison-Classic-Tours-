import Link from "next/link";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { listDestinations } from "@/server/catalogue";

export const dynamic = "force-dynamic";

export default async function AdminDestinationsPage() {
  await requirePermission("catalogue.read");
  const destinations = await listDestinations(false);
  return (
    <div className="grid gap-4">
      <FilterBar title="Destinations" count={destinations.length} />
      <p className="type-small text-ink/70">
        Names, copy, highlights, SEO and visibility are edited from the tour catalogue workflow.
      </p>
      {destinations.length === 0 ? (
        <EmptyState
          title="No destinations yet"
          description="Destinations appear once the catalogue is seeded."
        />
      ) : (
        <DataTable caption="Destinations">
          <TableHead>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Country</TableHeaderCell>
            <TableHeaderCell>SEO title</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHead>
          <TableBody>
            {destinations.map((destination) => (
              <tr key={destination.id}>
                <TableCell>
                  <Link href={`/destinations/${destination.slug}`} className="underline underline-offset-4">
                    {destination.name}
                  </Link>
                </TableCell>
                <TableCell>{destination.country}</TableCell>
                <TableCell>{destination.seoTitle ?? "—"}</TableCell>
                <TableCell>
                  <Badge tone={destination.published ? "earth" : "neutral"}>
                    {destination.published ? "Published" : "Hidden"}
                  </Badge>
                </TableCell>
              </tr>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
