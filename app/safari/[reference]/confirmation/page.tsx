import { notFound } from "next/navigation";
import { Container } from "@/components/ui/layout";
import { currentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { requireBookingAccess } from "@/server/portal";
import { NotFoundError } from "@/server/catalogue";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "To be confirmed";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  let booking;
  try {
    booking = await requireBookingAccess(await currentUser(), reference);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <Container className="max-w-3xl py-12">
      <p className="type-label text-clay-deep">African Bison Classic Tours · Booking confirmation</p>
      <h1 className="type-h1 mt-2">Your journey is reserved</h1>
      <dl className="type-body mt-6 grid gap-2">
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Booking reference</dt>
          <dd className="type-numeric font-semibold">{booking.reference}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Safari</dt>
          <dd>{booking.tour?.title ?? "Custom journey"}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Dates</dt>
          <dd>
            {formatDate(booking.travelStart)} → {formatDate(booking.travelEnd)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Travellers</dt>
          <dd>
            {booking.adults} adult{booking.adults === 1 ? "" : "s"}
            {booking.children > 0 ? `, ${booking.children} children` : ""}
            {booking.infants > 0 ? `, ${booking.infants} infants` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Total</dt>
          <dd className="type-numeric">{formatMoney(booking.totalCents, booking.currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Paid</dt>
          <dd className="type-numeric">{formatMoney(booking.paidCents, booking.currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-ink/10 py-2">
          <dt>Status</dt>
          <dd>{booking.status.replaceAll("_", " ")}</dd>
        </div>
      </dl>
      <p className="type-small mt-6 text-ink/70">
        Next step: complete traveller information in your safari portal. Contact
        African Bison Classic Tours on +254 734 466 432 with any questions —
        quote your reference.
      </p>
    </Container>
  );
}
