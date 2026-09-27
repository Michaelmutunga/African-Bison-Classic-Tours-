import { MediaForm } from "@/components/admin/content-forms";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { listMedia } from "@/server/content-admin";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const assets = await listMedia(await requestActor());
  return (
    <div className="grid max-w-4xl gap-4">
      <h2 className="type-h3">Media registry ({assets.length})</h2>
      <p className="type-small text-ink/70">
        URL-based records with alt text and attribution. Binary uploads behind a
        storage abstraction land in a later phase — register only assets you have
        the rights to use.
      </p>
      <Card>
        <CardBody>
          <MediaForm />
        </CardBody>
      </Card>
      {assets.length === 0 ? (
        <EmptyState title="No assets yet" description="Register images with proper attribution." />
      ) : (
        <DataTable caption="Media assets">
          <TableHead>
            <TableHeaderCell>Alt text</TableHeaderCell>
            <TableHeaderCell>Credit</TableHeaderCell>
            <TableHeaderCell>URL</TableHeaderCell>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <TableCell>{asset.alt}</TableCell>
                <TableCell>{asset.credit ?? "—"}</TableCell>
                <TableCell>{asset.url.slice(0, 48)}…</TableCell>
              </tr>
            ))}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}
