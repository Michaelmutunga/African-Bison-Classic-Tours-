import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { listDestinations } from "@/server/catalogue";

export const dynamic = "force-dynamic";

export default async function AdminDestinationsPage() {
  const destinations = await listDestinations(false);
  return (
    <div>
      <h2 className="type-h3">Destinations ({destinations.length})</h2>
      <p className="type-small mt-1 text-ink/70">
        Edit names, copy, highlights, SEO and visibility via PATCH /api/admin/destinations/:id.
      </p>
      <div className="mt-4">
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
      </div>
    </div>
  );
}
