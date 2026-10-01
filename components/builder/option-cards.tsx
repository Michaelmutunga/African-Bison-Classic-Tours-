"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import type { ImageEntry } from "@/lib/imagery";

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

function ImageCardShell({
  checked,
  onClick,
  label,
  hint,
  checkbox,
  image,
  caption,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  checkbox: boolean;
  image: ImageEntry | null;
  caption?: string;
}) {
  return (
    <button
      type="button"
      role={checkbox ? "checkbox" : "radio"}
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-[2px] border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay",
        checked
          ? "border-clay bg-clay/5"
          : "border-ink/20 bg-ink hover:border-ink/60",
      )}
    >
      <span className="relative block aspect-[16/10] overflow-hidden bg-night">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            style={{ objectPosition: image.focal }}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : null}
        {/* Scrim only over photography so text stays readable. */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "var(--scrim, linear-gradient(to top, rgba(14,13,11,0.78) 0%, rgba(14,13,11,0.25) 55%, rgba(14,13,11,0.05) 100%))" }}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-3 top-3 flex size-5 items-center justify-center border",
            checkbox ? "rounded-[2px]" : "rounded-full",
            checked ? "border-clay bg-clay text-ivory" : "border-ivory/80 bg-ink/40 text-ivory",
          )}
        >
          {checked ? (
            <svg width="11" height="9" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ) : null}
        </span>
        <span className="absolute inset-x-0 bottom-0 p-3.5">
          <span className="type-small block font-semibold text-ivory">{label}</span>
          {hint ? <span className="type-caption mt-0.5 block text-ivory/80">{hint}</span> : null}
        </span>
      </span>
      {caption ? <span className="type-caption block px-3.5 py-2 text-ink/60">{caption}</span> : null}
    </button>
  );
}

export function ImageCheckCard({
  checked,
  onToggle,
  label,
  hint,
  image,
  caption,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  image: ImageEntry | null;
  caption?: string;
}) {
  if (!image) {
    return <CheckCard checked={checked} onToggle={onToggle} label={label} hint={hint} />;
  }
  return (
    <ImageCardShell
      checkbox
      checked={checked}
      onClick={onToggle}
      label={label}
      hint={hint}
      image={image}
      caption={caption}
    />
  );
}

export function ImageRadioCard({
  value,
  checked,
  onSelect,
  label,
  hint,
  image,
  caption,
}: {
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  label: string;
  hint?: string;
  image: ImageEntry | null;
  caption?: string;
}) {
  if (!image) {
    return <RadioCard value={value} checked={checked} onSelect={onSelect} label={label} hint={hint} />;
  }
  return (
    <ImageCardShell
      checkbox={false}
      checked={checked}
      onClick={() => onSelect(value)}
      label={label}
      hint={hint}
      image={image}
      caption={caption}
    />
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
