import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { rateCaption } from "@/components/finance/money-dual";
import { currentUser } from "@/lib/auth";
import { getDisplayCurrency } from "@/lib/display-currency";
import { canSeeFinance, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || user.role === "CUSTOMER") {
    redirect("/staff/login?next=/admin");
  }
  const canCatalogue = hasPermission(user.role, "catalogue.write");
  const finance = canSeeFinance(user.role);
  const displayCurrency = await getDisplayCurrency();
  const kesRate = await prisma.currencyRate
    .findUnique({ where: { currency: "KES" } })
    .catch(() => null);
  const groups = [
    {
      title: "Operations",
      links: [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/bookings", label: "Bookings" },
        { href: "/admin/calendar", label: "Calendar" },
        { href: "/admin/transfers", label: "Transfers" },
        { href: "/admin/travellers", label: "Travellers" },
        { href: "/admin/fleet", label: "Fleet & guides" },
        { href: "/admin/suppliers", label: "Suppliers" },
        { href: "/admin/inquiries", label: "Enquiries" },
      ],
    },
    {
      title: "Money",
      links: [
        { href: "/admin/quotes", label: "Quotes" },
        ...(finance ? [{ href: "/admin/pricing", label: "Pricing" }] : []),
        { href: "/admin/invoices", label: "Invoices" },
        { href: "/admin/payments", label: "Payments" },
        ...(finance ? [{ href: "/admin/reports", label: "Reports" }] : []),
      ],
    },
    ...(canCatalogue
      ? [
          {
            title: "Catalogue",
            links: [
              { href: "/admin/tours", label: "Tours" },
              { href: "/admin/destinations", label: "Destinations" },
              { href: "/admin/accommodations", label: "Stays" },
              { href: "/admin/activities", label: "Activities" },
            ],
          },
          {
            title: "Content",
            links: [
              { href: "/admin/blog", label: "Journal" },
              { href: "/admin/faqs", label: "FAQs" },
              { href: "/admin/media", label: "Media" },
              { href: "/admin/settings", label: "Settings" },
            ],
          },
        ]
      : []),
    {
      title: "System",
      links: [
        { href: "/admin/notifications", label: "Notifications" },
        { href: "/admin/audit-logs", label: "Audit" },
      ],
    },
  ];

  return (
    <AdminShell
      userName={user.name}
      userRole={user.role}
      groups={groups}
      displayCurrency={displayCurrency}
      rateBadge={
        rateCaption(
          kesRate ? Number(kesRate.rateToBase) : null,
          kesRate ? kesRate.asOf.toISOString() : null,
        ) ?? (displayCurrency === "KES" ? "KES rate missing — set in Settings" : null)
      }
    >
      {children}
    </AdminShell>
  );
}
