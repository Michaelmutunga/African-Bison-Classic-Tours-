import Image from "next/image";
import type { DashboardBookingCard } from "@/lib/dashboard";
import { formatDay } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

/**
 * Cinematic hero for the next journey. Photography carries a scrim overlay
 * only; every figure underneath is a real booking value.
 */
export function UpcomingHero({ booking }: { booking: DashboardBookingCard }) {
  const balance = Math.max(0, booking.totalCents - booking.paidCents);
  const width = Math.max(0, Math.min(100, (booking.progressStage / booking.progressOf) * 100));

  return (
    <section aria-label="Your next safari" className="portal-card overflow-hidden">
      <div className="relative">
        {booking.heroImage ? (
          <Image
            src={booking.heroImage.src}
            alt={booking.heroImage.alt}
            width={booking.heroImage.width}
            height={booking.heroImage.height}
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="aspect-[16/8] w-full object-cover"
            priority={false}
          />
        ) : (
          <div aria-hidden="true" className="aspect-[16/8] w-full bg-sand" />
        )}
        <div aria-hidden="true" className="absolute inset-0" style={{ background: "var(--scrim)" }} />
        <div className="focus-ring-light absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="type-label text-sand">{booking.reference}</p>
          <h2 className="type-h2 mt-1 max-w-xl text-balance text-ivory">{booking.tourTitle}</h2>
          <p className="type-small mt-1.5 text-ivory/85">
            {booking.countdown} · {booking.party} {booking.party === 1 ? "traveller" : "travellers"}
            {booking.travelStart ? ` · from ${formatDay(booking.travelStart)}` : ""}
          </p>
        </div>
        <p className="absolute top-4 right-4">
          <Badge tone="sand">{booking.progressLabel}</Badge>
        </p>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <div
            role="img"
            aria-label={`Journey stage ${booking.progressStage} of ${booking.progressOf}`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-sand"
          >
            <div className="h-1.5 rounded-full bg-clay" style={{ width: `${width}%` }} />
          </div>
          <dl className="type-small mt-3 flex flex-wrap gap-x-6 gap-y-1 text-ink/70">
            <div className="flex gap-2">
              <dt>Paid</dt>
              <dd className="type-numeric font-semibold text-ink">
                {formatMoney(booking.paidCents, booking.currency)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt>Balance</dt>
              <dd className="type-numeric font-semibold text-ink">
                {formatMoney(balance, booking.currency)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/safari/${booking.reference}`} size="sm">
            Open my safari
          </ButtonLink>
          <ButtonLink href={`/safari/${booking.reference}#payments`} variant="secondary" size="sm">
            Payments
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function EmptyHero() {
  return (
    <section aria-label="Start your first safari" className="portal-card p-6 sm:p-8">
      <p className="type-label text-clay-deep">No upcoming safaris</p>
      <h2 className="type-h2 mt-2 max-w-md text-balance">Your East Africa story starts with one trip</h2>
      <p className="type-small mt-2 max-w-lg text-ink/70">
        Design a route with a planner, or browse ready itineraries across Kenya and Tanzania.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="/builder" size="sm">
          Design your safari
        </ButtonLink>
        <ButtonLink href="/tours" variant="secondary" size="sm">
          Explore safaris
        </ButtonLink>
      </div>
    </section>
  );
}
