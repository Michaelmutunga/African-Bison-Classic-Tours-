import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { PasswordForm } from "@/components/portal/password-form";
import { Card, CardBody } from "@/components/ui/card";
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
    <PortalShell>
      <p className="type-label text-clay-deep">Account</p>
      <h1 className="type-h1 mt-2">Profile</h1>
      <div className="mt-6 grid max-w-2xl gap-4">
        <Card>
          <CardBody>
            <p className="type-h3">{user.name}</p>
            <p className="type-small mt-1 text-ink/70">{user.email}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="type-h3">Change password</h2>
            <div className="mt-3">
              <PasswordForm />
            </div>
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
