import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { SafariWorkspace } from "@/components/portal/safari-workspace";
import { currentUser } from "@/lib/auth";
import { requireBookingAccess } from "@/server/portal";
import { NotFoundError } from "@/server/catalogue";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "My safari", robots: { index: false, follow: false } };
}

export default async function SafariPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const user = await currentUser();
  let booking;
  try {
    booking = await requireBookingAccess(user, reference);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <PortalShell>
      <p className="type-label text-clay-deep">{booking.reference}</p>
      <h1 className="type-h1 mt-2 max-w-3xl text-balance">
        {booking.tour?.title ?? "Custom journey"}
      </h1>
      <div className="mt-6">
        <SafariWorkspace booking={booking} />
      </div>
    </PortalShell>
  );
}
