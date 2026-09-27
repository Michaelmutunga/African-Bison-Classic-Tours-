import { SettingForm } from "@/components/admin/content-forms";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { listSettings } from "@/server/content-admin";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await listSettings(await requestActor());
  return (
    <div className="grid max-w-3xl gap-4">
      <h2 className="type-h3">Site settings ({settings.length})</h2>
      <p className="type-small text-ink/70">
        Business details the public site reads — changeable without code deploys.
      </p>
      <DataTable caption="Site settings">
        <TableHead>
          <TableHeaderCell>Key</TableHeaderCell>
          <TableHeaderCell>Value</TableHeaderCell>
        </TableHead>
        <TableBody>
          {settings.map((setting) => (
            <tr key={setting.key}>
              <TableCell>{setting.key}</TableCell>
              <TableCell>{setting.value}</TableCell>
            </tr>
          ))}
        </TableBody>
      </DataTable>
      <Card>
        <CardBody>
          <h3 className="type-h3">Add or update</h3>
          <div className="mt-2">
            <SettingForm />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
