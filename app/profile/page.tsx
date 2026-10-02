import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalAppShell } from "@/components/portal/dashboard/portal-app-shell";
import { ConciergeRailCard } from "@/components/portal/dashboard/rail-cards";
import { PasswordForm } from "@/components/portal/password-form";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/profile");
  if (user.role !== "CUSTOMER") redirect("/admin/tours");

  return (
    <PortalAppShell rail={<ConciergeRailCard />}>
      <p className="type-label text-clay-deep">Account</p>
      <h1 className="type-h1 mt-2">Profile</h1>
      <div className="mt-6 grid max-w-2xl gap-4">
        <section aria-label="Account details" className="portal-card p-5 sm:p-6">
          <p className="type-h3">{user.name}</p>
          <p className="type-small mt-1 text-ink/70">{user.email}</p>
        </section>
        <section aria-label="Change password" className="portal-card p-5 sm:p-6">
          <h2 className="type-h3">Change password</h2>
          <div className="mt-3">
            <PasswordForm />
          </div>
        </section>
      </div>
    </PortalAppShell>
  );
}
