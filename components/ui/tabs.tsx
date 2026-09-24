"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

/** Accessible tabs: arrow-key navigation, roving tabindex, labelled panels. */
export function Tabs({ items, defaultId }: { items: TabItem[]; defaultId?: string }) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(defaultId ?? items[0]?.id);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = items[(index + delta + items.length) % items.length];
    if (!next) return;
    setActiveId(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Content sections" className="flex gap-1 border-b border-ink/15">
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "type-label -mb-px cursor-pointer border-b-2 px-4 py-3 transition-colors",
                active
                  ? "border-clay text-ink"
                  : "border-transparent text-ink/55 hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) =>
        item.id === activeId ? (
          <div
            key={item.id}
            id={`${baseId}-panel-${item.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${item.id}`}
            className="py-5"
          >
            {item.content}
          </div>
        ) : null,
      )}
    </div>
  );
}
