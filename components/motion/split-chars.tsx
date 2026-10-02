"use client";

import { m } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Character-level split reveal, re-implemented natively (no CDN script,
 * per CSP). Every character slides up from ~120% inside a clipped line,
 * staggered by index, replaying whenever it re-enters view. The parent
 * must carry aria-label with the full string; chars are aria-hidden so
 * screen readers hear one string. Desktop pointers get a colour invert
 * on hover that keeps AA contrast on dark scrims.
 */
export function SplitChars({
  text,
  baseDelay = 0,
  stagger = 0.028,
  className,
  charClassName,
}: {
  text: string;
  baseDelay?: number;
  stagger?: number;
  className?: string;
  charClassName?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const chars = Array.from(text);
  if (reduced) return <span className={className}>{text}</span>;
  return (
    <>
      <span className={className} aria-hidden="true">
        {chars.map((char, index) => (
          <span key={`${char}-${index}`} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <m.span
              className={`split-char inline-block will-change-transform ${charClassName ?? ""}`}
              initial={{ y: "120%" }}
              whileInView={{ y: "0%" }}
              viewport={{ once: false, margin: "-5% 0px" }}
              transition={{
                duration: 0.65,
                delay: baseDelay + index * stagger,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {char === " " ? " " : char}
            </m.span>
          </span>
        ))}
      </span>
    </>
  );
}
