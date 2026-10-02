import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { calendarEvents } from "@/server/operations";
import { listSuppliers, listSupplierTypes, marketplaceCalendar } from "@/server/suppliers";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

function monthBounds(offset: number): { from: Date; to: Date; label: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return {
    from,
    to,
    label: from.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
  };
}

const KIND_TONE = { booking: "sand", transfer: "earth", hold: "clay" } as const;

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; status?: string; lockStatus?: string; supplierId?: string; serviceType?: string; location?: string }>;
}) {
  const params = await searchParams;
  const offset = Number.isFinite(Number(params.month)) ? Number(params.month) : 0;
  const view = params.view === "commitments" ? "commitments" : "bookings";
  const { from, to, label } = monthBounds(offset);
  const actor = await requestActor();
  const [{ events, conflicts }, market, suppliers, types] = await Promise.all([
    calendarEvents(actor, from, to),
    marketplaceCalendar(actor, from, to, {
      supplierId: params.supplierId || undefined,
      serviceType: params.serviceType || undefined,
      location: params.location || undefined,
      status: params.status || undefined,
      lockStatus: params.lockStatus || undefined,
    }),
    listSuppliers(actor, { status: "ACTIVE" }),
    listSupplierTypes(actor, true),
  ]);

  const weeks: { date: Date; items: typeof events }[][] = [];
  const cursor = new Date(from);
  // Monday-first grid.
  const lead = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - lead);
  while (cursor < to || weeks.flat().length === 0 || weeks[weeks.length - 1]?.some((d) => d.date < to)) {
    const week: { date: Date; items: typeof events }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(cursor);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      week.push({
        date,
        items: events.filter((event) => {
          const start = new Date(event.startsAt);
          const end = new Date(event.endsAt);
          return start < next && end > date;
        }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor > to && weeks.length > 6) break;
  }

  const allConflicts = market.conflicts.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-h3">{label} · {view === "commitments" ? "Supplier commitments" : "Bookings"}</h2>
        <div className="flex gap-2">
          <Link href={`/admin/calendar?month=${offset - 1}`} className="type-small underline underline-offset-4">← Prev</Link>
          <Link href="/admin/calendar?month=0" className="type-small underline underline-offset-4">This month</Link>
          <Link href={`/admin/calendar?month=${offset + 1}`} className="type-small underline underline-offset-4">Next →</Link>
        </div>
      </div>

      <form method="get" aria-label="Calendar filters" className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="month" value={offset} />
        <label className="type-small grid gap-1">
          View
          <select name="view" defaultValue={view} className="border border-ink/15 bg-transparent px-2 py-1.5">
            <option value="bookings">Bookings</option>
            <option value="commitments">Supplier commitments</option>
          </select>
        </label>
        <label className="type-small grid gap-1">
          Booking status
          <select name="status" defaultValue={params.status ?? ""} className="border border-ink/15 bg-transparent px-2 py-1.5">
            <option value="">All</option>
            {["NEW", "IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "CLIENT_REVISION", "AWAITING_PAYMENT", "PARTIALLY_PAID", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="type-small grid gap-1">
          Lock status
          <select name="lockStatus" defaultValue={params.lockStatus ?? ""} className="border border-ink/15 bg-transparent px-2 py-1.5">
            <option value="">All</option>
            {["REQUESTED", "HELD", "CONFIRMED", "DECLINED", "RELEASED", "COMPLETED"].map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="type-small grid gap-1">
          Supplier
          <select name="supplierId" defaultValue={params.supplierId ?? ""} className="max-w-52 border border-ink/15 bg-transparent px-2 py-1.5">
            <option value="">All</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </label>
        <label className="type-small grid gap-1">
          Service type
          <select name="serviceType" defaultValue={params.serviceType ?? ""} className="border border-ink/15 bg-transparent px-2 py-1.5">
            <option value="">All</option>
            {types.map((type) => (
              <option key={type.slug} value={type.slug}>{type.name}</option>
            ))}
          </select>
        </label>
        <label className="type-small grid gap-1">
          Location
          <input name="location" defaultValue={params.location ?? ""} placeholder="e.g. Mara" className="w-32 border border-ink/15 bg-transparent px-2 py-1.5" />
        </label>
        <button type="submit" className="type-small underline underline-offset-4">Apply</button>
        <Link href={`/admin/calendar?month=${offset}`} className="type-small underline underline-offset-4">Clear</Link>
      </form>

      {allConflicts > 0 ? (
        <div role="alert" className="type-small mt-3 rounded-[2px] border border-clay/50 bg-clay/5 px-4 py-3">
          <p className="font-semibold">Over capacity ({allConflicts})</p>
          <ul className="mt-1 list-disc pl-5">
            {market.conflicts.map((conflict, index) => (
              <li key={index}>
                {conflict.supplierName} · {conflict.serviceName}: {conflict.overBy} over capacity,{" "}
                {fmtDay(conflict.startsAt)} → {fmtDay(conflict.endsAt)}
                {conflict.bookingRefs.length > 0 ? ` (${conflict.bookingRefs.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="type-caption mt-3 text-ink/60">No supplier over capacity in view.</p>
      )}
      {conflicts.length > 0 ? (
        <div role="alert" className="type-small mt-3 rounded-[2px] border border-clay/50 bg-clay/5 px-4 py-3">
          <p className="font-semibold">Resource conflicts ({conflicts.length})</p>
          <ul className="mt-1 list-disc pl-5">
            {conflicts.map((conflict, index) => (
              <li key={index}>
                {conflict.resource}: {conflict.a} overlaps {conflict.b}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view === "bookings" ? (
        <div className="mt-4 grid gap-px overflow-hidden rounded-[2px] border border-ink/15 bg-ink/15 sm:grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <p key={day} className="type-label hidden bg-parchment px-2 py-1.5 sm:block">{day}</p>
          ))}
          {weeks.flat().map(({ date, items }) => {
            const inMonth = date.getMonth() === from.getMonth();
            return (
              <div key={date.toISOString()} className={`min-h-20 bg-ivory p-1.5 ${inMonth ? "" : "opacity-45"}`}>
                <p className="type-caption font-semibold">{date.getDate()}</p>
                <div className="mt-1 grid gap-1">
                  {items.slice(0, 4).map((event) => (
                    <span key={event.id} title={`${event.title} (${event.status})`}>
                      <Badge tone={KIND_TONE[event.kind]}>
                        {event.kind === "booking" && event.reference ? event.reference : event.title.slice(0, 22)}
                      </Badge>
                    </span>
                  ))}
                  {items.length > 4 ? (
                    <span className="type-caption text-ink/60">+{items.length - 4} more</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : market.commitments.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No commitments" description="No supplier locks overlap this view and filters." />
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {market.commitments.map((commitment) => (
            <li key={commitment.lockId} className="type-small flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-ink/10 px-3 py-2">
              <span>
                <strong>{commitment.supplierName}</strong> · {commitment.serviceName} ×{commitment.quantity} ·{" "}
                {fmtDay(commitment.startsAt)} → {fmtDay(commitment.endsAt)}
                {commitment.location ? ` · ${commitment.location}` : ""}
                {commitment.bookingRef ? (
                  <>
                    {" · "}
                    {commitment.bookingId ? (
                      <Link href={`/admin/bookings/${commitment.bookingId}`} className="underline underline-offset-4">
                        {commitment.bookingRef}
                      </Link>
                    ) : (
                      commitment.bookingRef
                    )}
                  </>
                ) : null}
              </span>
              <Badge tone={commitment.status === "CONFIRMED" || commitment.status === "COMPLETED" ? "earth" : commitment.status === "DECLINED" ? "clay" : "sand"}>
                {commitment.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardBody>
          <h3 className="type-h3">Legend</h3>
          <p className="type-small mt-1 text-ink/70">
            Bookings show travel windows; commitments show who is locked on which days and link
            back to the booking. Over-capacity warnings come from live lock math — the same
            checks that reject double-booking at creation.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
