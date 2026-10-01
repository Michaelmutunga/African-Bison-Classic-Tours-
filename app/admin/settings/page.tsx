import { RatesManager } from "@/components/admin/rates-manager";
import { SettingForm } from "@/components/admin/content-forms";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { listSettings } from "@/server/content-admin";
import { requestActor } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, rates] = await Promise.all([
    listSettings(await requestActor()),
    prisma.currencyRate.findMany({ orderBy: { currency: "asc" } }).catch(() => []),
  ]);
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

      <Card>
        <CardBody>
          <h3 className="type-h3" id="rates">Currency rates</h3>
          <p className="type-small mt-1 text-ink/70">
            Internal display rates (units per 1 USD). Used for indicative USD/KES conversions only.
          </p>
          <div className="mt-3">
            <RatesManager
              initial={rates.map((rate) => ({
                currency: rate.currency,
                rateToBase: String(rate.rateToBase),
                asOf: rate.asOf.toISOString(),
              }))}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
