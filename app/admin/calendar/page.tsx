import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { calendarEvents } from "@/server/operations";
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

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const offset = Number.isFinite(Number(month)) ? Number(month) : 0;
  const { from, to, label } = monthBounds(offset);
  const { events, conflicts } = await calendarEvents(await requestActor(), from, to);

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-h3">{label}</h2>
        <div className="flex gap-2">
          <Link href={`/admin/calendar?month=${offset - 1}`} className="type-small underline underline-offset-4">← Prev</Link>
          <Link href="/admin/calendar?month=0" className="type-small underline underline-offset-4">This month</Link>
          <Link href={`/admin/calendar?month=${offset + 1}`} className="type-small underline underline-offset-4">Next →</Link>
        </div>
      </div>
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
      ) : (
        <p className="type-caption mt-3 text-ink/60">No resource conflicts in view.</p>
      )}
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
      <Card>
        <CardBody>
          <h3 className="type-h3">Legend</h3>
          <p className="type-small mt-1 text-ink/70">
            Sand = bookings (travel window) · green = transfers · terracotta = active holds.
            The backend independently rejects double-booking; this view makes it visible.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
