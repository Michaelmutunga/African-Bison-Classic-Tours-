"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function startOfMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  // Monday-first offset
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return cells;
}

/**
 * Calendar primitive for travel-date selection (single date, Phase 1).
 * Range selection and season overlays land with the safari builder (Phase 4).
 */
export function Calendar({
  value,
  onChange,
  min,
  labelledBy,
}: {
  value?: Date;
  onChange?: (date: Date) => void;
  min?: Date;
  labelledBy: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => value ?? today);
  const cells = useMemo(
    () => startOfMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );
  const monthLabel = cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const sameDay = (a?: Date, b?: Date) =>
    !!a && !!b && a.toDateString() === b.toDateString();

  return (
    <div aria-labelledby={labelledBy} className="w-full max-w-xs">
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          ←
        </Button>
        <p className="type-small font-semibold" aria-live="polite">
          {monthLabel}
        </p>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next month"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          →
        </Button>
      </div>
      <div role="grid" aria-labelledby={labelledBy} className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((day) => (
          <span key={day} role="columnheader" className="type-caption py-1 text-center text-ink/55">
            {day}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const disabled = min ? date < min && !sameDay(date, min) : false;
          const selected = sameDay(date, value);
          const isToday = sameDay(date, today);
          return (
            <button
              key={date.toISOString()}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-label={date.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              disabled={disabled || !onChange}
              onClick={() => onChange?.(date)}
              className={cn(
                "type-small flex aspect-square cursor-pointer items-center justify-center rounded-[2px]",
                selected
                  ? "bg-ink font-semibold text-ivory"
                  : "hover:bg-sand/60",
                isToday && !selected && "underline underline-offset-4",
                disabled && "cursor-not-allowed text-ink/30 hover:bg-transparent",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
