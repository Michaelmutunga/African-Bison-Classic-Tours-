import Link from "next/link";
import type { DashboardBookingCard } from "@/lib/dashboard";
import { formatDay } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";

/**
 * Operations-first grid: checklist, money, documents and messages for the
 * next journey. All figures are real booking values.
 */
export function OpsGrid({ booking }: { booking: DashboardBookingCard }) {
  const balance = Math.max(0, booking.totalCents - booking.paidCents);
  const depositDone = booking.depositCents <= 0 || booking.paidCents >= booking.depositCents;
  const open = booking.checklist.filter((item) => item.status === "pending").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section aria-label="Pre-trip checklist" className="portal-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="type-h3">Before you travel</h2>
          <span className="type-caption text-ink/60">
            {open === 0 ? "All complete" : `${open} open`}
          </span>
        </div>
        <ul className="mt-3 grid gap-2.5">
          {booking.checklist.map((item) => (
            <li key={item.key} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className={item.status === "complete" ? "font-semibold text-earth" : "text-ink/35"}
              >
                {item.status === "complete" ? "✓" : "○"}
              </span>
              <span>
                <span className="type-small font-semibold">
                  {item.label}
                  <span className="sr-only">: {item.status}</span>
                </span>
                <span className="type-caption block text-ink/60">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid content-start gap-4">
        <section aria-label="Payment summary" id="payments" className="portal-card scroll-mt-24 p-5">
          <h2 className="type-h3">Payments</h2>
          <dl className="type-small mt-3 grid grid-cols-3 gap-2 text-ink/70">
            <div>
              <dt className="type-caption">Total</dt>
              <dd className="type-numeric type-small font-semibold text-ink">
                {formatMoney(booking.totalCents, booking.currency)}
              </dd>
            </div>
            <div>
              <dt className="type-caption">Paid</dt>
              <dd className="type-numeric type-small font-semibold text-ink">
                {formatMoney(booking.paidCents, booking.currency)}
              </dd>
            </div>
            <div>
              <dt className="type-caption">Balance</dt>
              <dd className="type-numeric type-small font-semibold text-ink">
                {formatMoney(balance, booking.currency)}
              </dd>
            </div>
          </dl>
          <p className="type-caption mt-2 text-ink/60">
            {depositDone ? "Deposit received. Thank you." : "Deposit still open on this journey."}
            {booking.travelStart ? ` Travel from ${formatDay(booking.travelStart)}.` : ""}
          </p>
          <Link
            href={`/safari/${booking.reference}`}
            className="type-small mt-3 inline-block font-semibold text-clay-deep underline underline-offset-4 hover:text-clay"
          >
            Open payments
          </Link>
        </section>

        <section aria-label="Documents and messages" className="portal-card grid grid-cols-2 gap-2 p-3">
          <Link
            href={`/safari/${booking.reference}`}
            className="rounded-[10px] px-3 py-3 hover:bg-sand/40"
          >
            <span className="type-small font-semibold">Documents</span>
            <span className="type-caption block text-ink/60">Confirmations and receipts</span>
          </Link>
          <Link
            href={`/safari/${booking.reference}`}
            className="rounded-[10px] px-3 py-3 hover:bg-sand/40"
          >
            <span className="type-small font-semibold">Messages</span>
            <span className="type-caption block text-ink/60">Talk to your safari team</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
