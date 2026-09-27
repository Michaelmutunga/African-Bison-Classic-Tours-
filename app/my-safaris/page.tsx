import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { currentUser } from "@/lib/auth";
import { listMyBookings } from "@/server/portal";

export const metadata: Metadata = {
  title: "My safaris",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MySafarisPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/my-safaris");
  if (user.role !== "CUSTOMER") redirect("/admin/tours");

  const bookings = await listMyBookings(user);

  return (
    <PortalShell>
      <p className="type-label text-clay-deep">Journey history</p>
      <h1 className="type-h1 mt-2">My safaris</h1>
      {bookings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No safaris yet"
            description="Your confirmed and past journeys will live here."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardBody>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="type-h3">
                    <Link href={`/safari/${booking.reference}`} className="hover:text-clay-deep">
                      {booking.tour?.title ?? "Custom journey"}
                    </Link>
                  </h2>
                  <Badge tone={booking.status === "COMPLETED" ? "earth" : "sand"}>
                    {booking.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="type-small mt-1 text-ink/70">
                  {booking.reference} · {booking.adults + booking.children + booking.infants} traveller
                  {booking.adults + booking.children + booking.infants === 1 ? "" : "s"}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
