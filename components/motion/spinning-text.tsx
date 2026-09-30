"use client";

import Link from "next/link";

/**
 * Spinning circular badge. Text rides a circular path and rotates
 * slowly; the centre arrow points at the linked section. Rotation is a
 * CSS animation, so the global reduced-motion rule already stills it,
 * and the link keeps its accessible name either way.
 */
export function SpinningText({
  text,
  href,
  label,
  className,
}: {
  text: string;
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative block h-28 w-28 text-ivory ${className ?? ""}`}
    >
      <svg viewBox="0 0 100 100" className="spin-slow absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id="spin-circle" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
        </defs>
        <text className="fill-current text-[8.2px] tracking-[0.24em] uppercase">
          <textPath href="#spin-circle">{text}</textPath>
        </text>
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-2xl transition-transform duration-300 group-hover:translate-y-1"
      >
        ↓
      </span>
    </Link>
  );
}
