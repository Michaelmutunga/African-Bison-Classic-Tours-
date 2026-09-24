import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { TableBody, TableCell, DataTable, TableHead, TableHeaderCell } from "@/components/ui/table";

describe("button", () => {
  it("renders with accessible name and variant classes", () => {
    render(<Button variant="accent">Design your safari</Button>);
    const button = screen.getByRole("button", { name: "Design your safari" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-clay");
  });

  it("supports disabled state", () => {
    render(<Button disabled>Unavailable</Button>);
    expect(screen.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  });

  it("button link renders an anchor", () => {
    render(<ButtonLink href="/tours">Explore safaris</ButtonLink>);
    const link = screen.getByRole("link", { name: "Explore safaris" });
    expect(link).toHaveAttribute("href", "/tours");
  });
});

describe("badge", () => {
  it("renders status text with tone", () => {
    render(<Badge tone="earth">Available</Badge>);
    expect(screen.getByText("Available")).toBeInTheDocument();
  });
});

describe("card", () => {
  it("renders article landmark content", () => {
    render(
      <Card>
        <CardBody>Kenya</CardBody>
      </Card>,
    );
    expect(screen.getByRole("article")).toHaveTextContent("Kenya");
  });
});

describe("data table", () => {
  it("renders captioned table with headers", () => {
    render(
      <DataTable caption="Safari prices">
        <TableHead>
          <TableHeaderCell>Tour</TableHeaderCell>
        </TableHead>
        <TableBody>
          <tr>
            <TableCell>Mara</TableCell>
          </tr>
        </TableBody>
      </DataTable>,
    );
    expect(screen.getByRole("table", { name: "Safari prices" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tour" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Mara" })).toBeInTheDocument();
  });
});
