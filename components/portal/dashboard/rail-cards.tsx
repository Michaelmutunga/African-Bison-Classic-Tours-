import Link from "next/link";
import { NotificationFeed } from "@/components/portal/notifications";
import { SITE_CONTACT } from "@/lib/site-contact";
import { formatMoney } from "@/lib/money";
import type { DashboardBookingCard } from "@/lib/dashboard";

export function PaymentsRailCard({ booking }: { booking: DashboardBookingCard }) {
  const balance = Math.max(0, booking.totalCents - booking.paidCents);
  return (
    <section aria-label="Payment card" className="portal-card focus-ring-light bg-night p-5 text-ivory">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="type-h3">My payments</h2>
        <span className="type-caption text-ivory/60">{booking.currency}</span>
      </div>
      <p className="type-numeric mt-2 text-3xl font-semibold tracking-tight">
        {formatMoney(balance, booking.currency)}
      </p>
      <p className="type-caption mt-1 text-ivory/65">
        Balance on {booking.reference} · {formatMoney(booking.paidCents, booking.currency)} paid
      </p>
      <Link
        href={`/safari/${booking.reference}`}
        className="type-small mt-3 inline-block rounded-[10px] bg-ivory px-4 py-2 font-semibold text-ink hover:bg-sand"
      >
        Review payments
      </Link>
    </section>
  );
}

export function ConciergeRailCard() {
  return (
    <section aria-label="Safari help" id="help" className="portal-card scroll-mt-24 p-5">
      <h2 className="type-h3">Talk to your team</h2>
      <p className="type-small mt-1.5 text-ink/65">
        Nairobi based planners who know these roads. Ask about dates, lodges or pace.
      </p>
      <ul className="type-small mt-3 grid gap-2">
        <li>
          <a href={SITE_CONTACT.phoneHref} className="font-semibold text-clay-deep underline underline-offset-4 hover:text-clay">
            {SITE_CONTACT.phoneDisplay}
          </a>
        </li>
        <li>
          <a href={`mailto:${SITE_CONTACT.email}`} className="font-semibold text-clay-deep underline underline-offset-4 hover:text-clay">
            {SITE_CONTACT.email}
          </a>
        </li>
        <li className="flex flex-wrap gap-2 pt-1">
          <Link href="/request" className="rounded-[10px] border border-ink/20 px-3.5 py-1.5 font-medium hover:border-ink">
            Custom request
          </Link>
          <Link href="/travel-information" className="rounded-[10px] border border-ink/20 px-3.5 py-1.5 font-medium hover:border-ink">
            Travel information
          </Link>
        </li>
      </ul>
    </section>
  );
}

export function UpdatesRailCard() {
  return (
    <div id="updates" className="portal-card scroll-mt-24 p-5">
      <NotificationFeed />
    </div>
  );
}
