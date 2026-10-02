import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { formatPct, listMarkupRules, listTaxFees } from "@/server/marketplace-pricing";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

function ruleLabel(mode: string, bps: number | null, fixed: number | null, currency: string): string {
  if (mode === "PERCENT") return `${formatPct(bps ?? 0)} on cost`;
  return `${formatMoney(fixed ?? 0, currency)} fixed`;
}

export default async function AdminPricingPage() {
  const actor = await requestActor();
  const [rules, taxes] = await Promise.all([listMarkupRules(actor), listTaxFees(actor)]);

  return (
    <div>
      <h2 className="type-h3">Pricing rules</h2>
      <p className="type-small mt-1 text-ink/70">
        Markup resolves line override → supplier → service type → global default.
        Taxes are separate lines, never hidden in markup. Manage via
        POST /api/admin/markup-rules and /api/admin/tax-fees.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Markup rules ({rules.length})</h3>
            {rules.length === 0 ? (
              <div className="mt-2">
                <EmptyState title="No rules" description="Seed the global default first." />
              </div>
            ) : (
              <div className="mt-2">
                <DataTable caption="Markup rules">
                  <TableHead>
                    <TableHeaderCell>Scope</TableHeaderCell>
                    <TableHeaderCell>Rule</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <TableCell>
                          {rule.scope}
                          {rule.scopeKey ? (
                            <span className="type-caption block text-ink/55">{rule.scopeKey}</span>
                          ) : null}
                        </TableCell>
                        <TableCell>{ruleLabel(rule.mode, rule.percentBps, rule.fixedCents, rule.currency)}</TableCell>
                        <TableCell>
                          <Badge tone={rule.active ? "earth" : "neutral"}>
                            {rule.active ? "active" : "inactive"}
                          </Badge>
                        </TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="type-h3">Taxes & fees ({taxes.length})</h3>
            {taxes.length === 0 ? (
              <div className="mt-2">
                <EmptyState title="No taxes" description="Finance adds real taxes when advised." />
              </div>
            ) : (
              <div className="mt-2">
                <DataTable caption="Taxes and fees">
                  <TableHead>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Amount</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {taxes.map((tax) => (
                      <tr key={tax.id}>
                        <TableCell>{tax.name}</TableCell>
                        <TableCell>{ruleLabel(tax.mode, tax.percentBps, tax.fixedCents, tax.currency)}</TableCell>
                        <TableCell>
                          <Badge tone={tax.active ? "earth" : "neutral"}>
                            {tax.active ? "active" : "inactive"}
                          </Badge>
                        </TableCell>
                      </tr>
                    ))}
                  </TableBody>
                </DataTable>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
