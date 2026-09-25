import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || !hasPermission(user.role, "catalogue.write")) {
    redirect("/login?next=/admin/tours");
  }
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <p className="type-label text-clay-deep">Operations console · Phase 3 catalogue</p>
          <h1 className="type-h2 mt-1">Catalogue</h1>
        </div>
        <nav aria-label="Admin" className="type-small flex gap-4">
          <Link href="/admin/tours" className="underline underline-offset-4">
            Tours
          </Link>
          <span className="text-ink/50">
            Signed in as {user.name} ({user.role})
          </span>
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
