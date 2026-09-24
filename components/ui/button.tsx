import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink-soft",
  accent: "bg-clay text-ivory hover:bg-clay-deep",
  secondary:
    "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink/5",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-[0.9375rem]",
  lg: "px-7 py-3.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "type-label inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] normal-case transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <a
      className={cn(
        "type-label inline-flex items-center justify-center gap-2 rounded-[2px] normal-case transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
