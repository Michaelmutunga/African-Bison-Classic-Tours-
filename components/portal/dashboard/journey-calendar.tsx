"use client";

import { useMemo, useState } from "react";
import type { JourneyRange } from "@/lib/dashboard";
import { formatDay, journeyMonthCells } from "@/lib/dashboard";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export interface CalendarJourney extends JourneyRange {
  reference: string;
  title: string;
}

/**
 * Read-only journey calendar. Highlights real travel ranges from the
 * customer's bookings; empty months say so plainly instead of faking plans.
 */
export function JourneyCalendar({ journeys }: { journeys: CalendarJourney[] }) {
  const initial = useMemo(() => {
    const first = journeys.find((journey) => journey.startIso);
    const base = first ? new Date(first.startIso) : new Date();
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
  }, [journeys]);
  const [cursor, setCursor] = useState(initial);
  const cells = useMemo(
    () => journeyMonthCells(cursor.year, cursor.month, journeys),
    [cursor, journeys],
  );
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section aria-label="Journey calendar" id="calendar" className="portal-card scroll-mt-24 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="type-h3">Available dates</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))}
            className="type-small cursor-pointer rounded-[8px] px-2.5 py-1 hover:bg-sand/60"
          >
            ‹
          </button>
          <p className="type-small min-w-28 text-center font-semibold" aria-live="polite">
            {monthLabel}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))}
            className="type-small cursor-pointer rounded-[8px] px-2.5 py-1 hover:bg-sand/60"
          >
            ›
          </button>
        </div>
      </div>
      {journeys.length === 0 ? (
        <p className="type-small mt-3 text-ink/65">
          No travel dates yet. Your confirmed journeys will be marked here.
        </p>
      ) : (
        <>
          <div role="grid" aria-label={`Journeys in ${monthLabel}`} className="mt-3 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span key={day} role="columnheader" className="type-caption py-1 text-center text-ink/55">
                {day}
              </span>
            ))}
            {cells.map((cell) =>
              cell.day === null ? (
                <span key={cell.key} />
              ) : (
                <span
                  key={cell.key}
                  role="gridcell"
                  aria-label={`${cell.day} ${monthLabel}${cell.inRange ? ", travel day" : ""}`}
                  aria-selected={cell.inRange}
                  className={cn(
                    "type-small flex aspect-square items-center justify-center rounded-full",
                    cell.inRange ? "bg-ink font-semibold text-ivory" : "text-ink/70",
                    cell.isToday && !cell.inRange && "underline underline-offset-4",
                  )}
                >
                  {cell.day}
                </span>
              ),
            )}
          </div>
          <ul className="mt-3 grid gap-1.5 border-t border-ink/10 pt-3">
            {journeys.slice(0, 4).map((journey) => (
              <li key={journey.reference} className="type-small flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{journey.title}</span>
                <span className="type-caption type-numeric shrink-0 text-ink/60">
                  {formatDay(journey.startIso)}
                  {journey.endIso ? ` to ${formatDay(journey.endIso)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
