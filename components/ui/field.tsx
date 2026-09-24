import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "w-full rounded-[2px] border border-ink/20 bg-ivory px-3.5 py-2.5 text-[1rem] text-ink placeholder:text-ink/40 hover:border-ink/40 aria-invalid:border-clay-deep";

export function Label({
  className,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("type-label mb-1.5 block normal-case tracking-normal", className)}
      {...rest}
    />
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...rest} />;
}

export function Textarea({
  className,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(controlClass, className)} {...rest} />;
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="type-caption mt-1.5 text-clay-deep">
      {children}
    </p>
  );
}

export function FieldHint({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="type-caption mt-1.5 text-ink/60">
      {children}
    </p>
  );
}
