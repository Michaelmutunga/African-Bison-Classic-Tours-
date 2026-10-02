"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Spinning circular badge. Text rides a circular path and rotates
 * slowly; the centre slot stays upright and static. Rotation is a CSS
 * animation, so the global reduced-motion rule already stills it, and
 * the link keeps its accessible name either way. Colour comes from
 * `tone` (currentColor) so the badge adapts to light and dark surfaces.
 */
export function SpinningText({
  text,
  href,
  label,
  className,
  pathId = "spin-circle",
  center,
  tone = "text-ivory",
  ringClassName,
  ringLength,
}: {
  text: string;
  href: string;
  label: string;
  className?: string;
  pathId?: string;
  center?: ReactNode;
  tone?: string;
  ringClassName?: string;
  /** Exact path length to fit the text around the full circle. */
  ringLength?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative block h-28 w-28 ${tone} ${className ?? ""}`}
    >
      <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id={pathId} d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
        </defs>
        <text
          className={`fill-current text-[8.2px] tracking-[0.24em] uppercase ${ringClassName ?? ""}`}
        >
          <textPath
            href={`#${pathId}`}
            textLength={ringLength}
            lengthAdjust={ringLength === undefined ? undefined : "spacingAndGlyphs"}
          >
            {text}
          </textPath>
        </text>
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
        {center ?? (
          <span className="text-2xl transition-transform duration-300 group-hover:translate-y-1">
            ↓
          </span>
        )}
      </span>
    </Link>
  );
}
