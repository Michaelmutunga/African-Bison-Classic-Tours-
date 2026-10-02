import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/** Sticky summary header for detail/workspaces: ref, status, totals, actions. */
export function DetailHeader({
  eyebrow,
  title,
  status,
  meta,
  actions,
}: {
  eyebrow: string;
  title: string;
  status?: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[2px] border border-ink/15 bg-parchment px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="type-label text-clay-deep">{eyebrow}</p>
          <h2 className="type-h2 mt-1">{title}</h2>
          {meta ? <p className="type-small mt-1 text-ink/70">{meta}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status ? <Badge tone="sand">{status.replaceAll("_", " ")}</Badge> : null}
          {actions}
        </div>
      </div>
    </div>
  );
}
