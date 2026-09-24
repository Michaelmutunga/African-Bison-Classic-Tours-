import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

async function violations(): Promise<string[]> {
  const results = await axe.run(document, {
    rules: {
      // Document-shell rules: covered by app/layout.tsx (lang + metadata
      // title) and verified in a real browser via Playwright.
      region: { enabled: false },
      "document-title": { enabled: false },
      "html-has-lang": { enabled: false },
    },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`);
}

describe("accessibility", () => {
  it("footer has no axe violations", async () => {
    render(<SiteFooter />);
    await expect(violations()).resolves.toEqual([]);
  });

  it("labelled card form sample has no axe violations", async () => {
    render(
      <Card>
        <CardBody>
          <Label htmlFor="sample-email">Email</Label>
          <Input id="sample-email" type="email" autoComplete="email" />
        </CardBody>
      </Card>,
    );
    await expect(violations()).resolves.toEqual([]);
  });
});
