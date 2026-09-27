import { DeleteResource, GuideForm, VehicleForm } from "@/components/admin/resource-forms";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { listGuides, listVehicles } from "@/server/operations";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const actor = await requestActor();
  const [vehicles, guides] = await Promise.all([listVehicles(actor), listGuides(actor)]);

  return (
    <div className="grid gap-8">
      <section aria-label="Vehicles">
        <h2 className="type-h3">Vehicles ({vehicles.length})</h2>
        <div className="mt-3">
          <DataTable caption="Vehicles">
            <TableHead>
              <TableHeaderCell>Registration</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Capacity</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableHead>
            <TableBody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <TableCell>{vehicle.registration}</TableCell>
                  <TableCell>{vehicle.type}</TableCell>
                  <TableCell numeric>{vehicle.capacity}</TableCell>
                  <TableCell>
                    <Badge tone={vehicle.status === "active" ? "earth" : "neutral"}>{vehicle.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DeleteResource url={`/api/admin/vehicles/${vehicle.id}`} label={vehicle.registration} />
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </DataTable>
        </div>
        <div className="mt-4">
          <VehicleForm />
        </div>
      </section>

      <section aria-label="Guides">
        <h2 className="type-h3">Guides ({guides.length})</h2>
        <div className="mt-3">
          <DataTable caption="Guides">
            <TableHead>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Languages</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableHead>
            <TableBody>
              {guides.map((guide) => (
                <tr key={guide.id}>
                  <TableCell>{guide.name}</TableCell>
                  <TableCell>{guide.languages.join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Badge tone={guide.status === "active" ? "earth" : "neutral"}>{guide.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DeleteResource url={`/api/admin/guides/${guide.id}`} label={guide.name} />
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </DataTable>
        </div>
        <div className="mt-4">
          <GuideForm />
        </div>
      </section>
    </div>
  );
}
