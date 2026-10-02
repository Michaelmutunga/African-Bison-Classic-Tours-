import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ImageEntry } from "@/lib/imagery";

export interface TimelineEntry {
  id: string;
  marker: string;
  title: string;
  detail?: React.ReactNode;
  image?: ImageEntry | null;
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
          {entry.image ? (
            <span className="relative mt-3 block aspect-[16/9] overflow-hidden rounded-[2px] bg-night">
              <Image
                src={entry.image.src}
                alt={entry.image.alt}
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                style={{ objectPosition: entry.image.focal }}
                className="object-cover"
                loading="lazy"
              />
            </span>
          ) : null}
          {entry.detail ? <div className="type-small mt-2 text-ink/75">{entry.detail}</div> : null}
        </li>
      ))}
    </ol>
  );
}
