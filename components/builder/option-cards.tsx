"use client";

import { cn } from "@/lib/cn";

function CardShell({
  checked,
  onClick,
  label,
  hint,
  checkbox,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  checkbox: boolean;
}) {
  return (
    <button
      type="button"
      role={checkbox ? "checkbox" : "radio"}
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-[2px] border px-4 py-3.5 text-left transition-colors",
        checked
          ? "border-clay bg-clay/5"
          : "border-ink/20 bg-ivory hover:border-ink/50",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-4 shrink-0 items-center justify-center border",
            checkbox ? "rounded-[2px]" : "rounded-full",
            checked ? "border-clay bg-clay text-ivory" : "border-ink/40",
          )}
        >
          {checked ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ) : null}
        </span>
        <span className="type-small font-semibold">{label}</span>
      </span>
      {hint ? <span className="type-caption mt-1 block pl-[26px] text-ink/60">{hint}</span> : null}
    </button>
  );
}

export function RadioCard({
  value,
  checked,
  onSelect,
  label,
  hint,
}: {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  label: string;
  hint?: string;
}) {
  return (
    <CardShell
      checkbox={false}
      checked={checked}
      onClick={() => onSelect(value)}
      label={label}
      hint={hint}
    />
  );
}

export function CheckCard({
  checked,
  onToggle,
  label,
  hint,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <CardShell checkbox checked={checked} onClick={onToggle} label={label} hint={hint} />
  );
}

export function StepHeading({ title, lede }: { title: string; lede?: string }) {
  return (
    <div>
      <h2 className="type-h2 text-balance">{title}</h2>
      {lede ? <p className="type-small mt-2 max-w-xl text-ink/70">{lede}</p> : null}
    </div>
  );
}

export function StepErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="type-small mt-4 rounded-[2px] border border-clay/40 bg-clay/5 px-4 py-3">
      <ul className="list-disc pl-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
