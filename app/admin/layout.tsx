import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || user.role === "CUSTOMER") {
    redirect("/login?next=/admin");
  }
  const canCatalogue = hasPermission(user.role, "catalogue.write");
  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/calendar", label: "Calendar" },
    ...(canCatalogue ? [{ href: "/admin/tours", label: "Tours" }] : []),
    ...(canCatalogue ? [{ href: "/admin/destinations", label: "Destinations" }] : []),
    ...(canCatalogue ? [{ href: "/admin/blog", label: "Journal" }] : []),
    ...(canCatalogue ? [{ href: "/admin/faqs", label: "FAQs" }] : []),
    ...(canCatalogue ? [{ href: "/admin/media", label: "Media" }] : []),
    ...(canCatalogue ? [{ href: "/admin/settings", label: "Settings" }] : []),
    { href: "/admin/quotes", label: "Quotes" },
    { href: "/admin/pricing", label: "Pricing" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/travellers", label: "Travellers" },
    { href: "/admin/fleet", label: "Fleet & guides" },
    { href: "/admin/suppliers", label: "Suppliers" },
    { href: "/admin/transfers", label: "Transfers" },
    { href: "/admin/inquiries", label: "Enquiries" },
    { href: "/admin/notifications", label: "Notifications" },
    { href: "/admin/audit-logs", label: "Audit" },
  ];

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <p className="type-label text-clay-deep">Operations console</p>
          <h1 className="type-h2 mt-1">African Bison operations</h1>
        </div>
        <p className="type-small text-ink/60">
          Signed in as {user.name} ({user.role})
        </p>
      </div>
      <nav aria-label="Operations" className="mt-4 flex flex-wrap gap-1.5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "type-caption rounded-full border border-ink/20 px-3 py-1.5 hover:border-ink",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
