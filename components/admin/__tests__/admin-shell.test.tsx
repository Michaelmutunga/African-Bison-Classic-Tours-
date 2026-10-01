import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminShell } from "@/components/admin/admin-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminShell", () => {
  it("groups nav, marks active link and shows currency controls", () => {
    render(
      <AdminShell
        userName="Wanjiru"
        userRole="ADMIN"
        displayCurrency="KES"
        rateBadge="1 USD = 129 KES"
        groups={[
          { title: "Operations", links: [{ href: "/admin", label: "Dashboard" }] },
          { title: "Money", links: [{ href: "/admin/payments", label: "Payments" }] },
        ]}
      >
        <p>Child</p>
      </AdminShell>,
    );
    expect(screen.getAllByText("Operations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Money").length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: "Display currency" })).toBeInTheDocument();
    expect(screen.getByText("1 USD = 129 KES")).toBeInTheDocument();
    expect(screen.getByText("Signed in as Wanjiru (ADMIN)")).toBeInTheDocument();
  });
});
