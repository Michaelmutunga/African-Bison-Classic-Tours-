"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/cn";

function paramsWith(search: URLSearchParams, key: string, value: string | null) {
  const next = new URLSearchParams(search.toString());
  if (value === null || value === "") next.delete(key);
  else next.set(key, value);
  const query = next.toString();
  return query ? `?${query}` : "?";
}

/** Labelled search input that syncs via GET links (progressive enhancement). */
export function SearchInput({
  name = "search",
  defaultValue = "",
  placeholder = "Search…",
  label,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  label: string;
}) {
  return (
    <form method="get" role="search" aria-label={label} className="flex items-end gap-2">
      <div className="min-w-44 flex-1">
        <Label htmlFor={`filter-${name}`}>{label}</Label>
        <Input id={`filter-${name}`} name={name} defaultValue={defaultValue} placeholder={placeholder} />
      </div>
      <button
        type="submit"
        className="type-small shrink-0 cursor-pointer rounded-[2px] border border-ink/25 px-3 py-2.5 hover:border-ink"
      >
        Search
      </button>
    </form>
  );
}

/** Tab-style status filter preserving other query params. */
export function StatusTabs({
  param = "status",
  options,
}: {
  param?: string;
  options: { value: string | null; label: string }[];
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = search.get(param);
  return (
    <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const value = option.value ?? "";
        const active = (current ?? "") === value;
        const href = `${pathname}${paramsWith(search, param, option.value)}`;
        return (
          <Link
            key={option.label}
            role="tab"
            aria-selected={active}
            href={href}
            className={cn(
              "type-caption rounded-full border px-3 py-1.5",
              active ? "border-ink bg-ink text-ivory" : "border-ink/20 hover:border-ink",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Section heading row used across admin list pages. */
export function FilterBar({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-h3" aria-live="polite">
          {title}
          {typeof count === "number" ? ` (${count})` : ""}
        </h2>
      </div>
      {children ? <div className="grid gap-3 md:flex md:flex-wrap md:items-end md:gap-4">{children}</div> : null}
    </div>
  );
}
