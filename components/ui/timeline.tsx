import { cn } from "@/lib/cn";

export interface TimelineEntry {
  id: string;
  marker: string;
  title: string;
  detail?: React.ReactNode;
}

/** Vertical itinerary timeline. Semantic ordered list with a fine-line rail. */
export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn("relative ml-2 border-l border-ink/20 pl-6", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative pb-8 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[31px] top-1 size-2.5 rounded-full border-2 border-ivory bg-clay outline outline-1 outline-ink/25"
          />
          <p className="type-label text-clay-deep">{entry.marker}</p>
          <p className="type-h3 mt-1">{entry.title}</p>
          {entry.detail ? <div className="type-small mt-1 text-ink/75">{entry.detail}</div> : null}
        </li>
      ))}
    </ol>
  );
}
