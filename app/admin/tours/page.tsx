import Link from "next/link";
import { DeleteTour, PublishToggle } from "@/components/admin/tour-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { listTours } from "@/server/catalogue";

export default async function AdminToursPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string; search?: string }>;
}) {
  const { published, search } = await searchParams;
  const tours = await listTours({
    publishedOnly: published !== "all",
    search: search || undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-small text-ink/70" aria-live="polite">
          {tours.length} tour{tours.length === 1 ? "" : "s"}
          {published === "all" ? " (including unpublished)" : " (published only)"}
        </p>
        <div className="flex gap-2">
          <ButtonLink
            href={published === "all" ? "/admin/tours" : "/admin/tours?published=all"}
            variant="secondary"
            size="sm"
          >
            {published === "all" ? "Published only" : "Show all"}
          </ButtonLink>
          <ButtonLink href="/admin/tours/new" size="sm">
            New tour
          </ButtonLink>
        </div>
      </div>
      <div className="mt-4">
        <DataTable caption="Tours">
          <TableHead>
            <TableHeaderCell>Title</TableHeaderCell>
            <TableHeaderCell>Duration</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableHead>
          <TableBody>
            {tours.map((tour) => (
              <tr key={tour.id}>
                <TableCell>
                  <Link
                    href={`/admin/tours/${tour.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {tour.title}
                  </Link>
                  <span className="type-caption block text-ink/55">/{tour.slug}</span>
                </TableCell>
                <TableCell numeric>{tour.durationDays}d</TableCell>
                <TableCell>
                  <Badge tone={tour.published ? "earth" : "neutral"}>
                    {tour.published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-2">
                    <PublishToggle id={tour.id} published={tour.published} />
                    <DeleteTour id={tour.id} title={tour.title} />
                  </span>
                </TableCell>
              </tr>
            ))}
          </TableBody>
        </DataTable>
      </div>
    </div>
  );
}
