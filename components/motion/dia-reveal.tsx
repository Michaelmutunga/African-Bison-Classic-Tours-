"use client";

import { m } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Diagonal masked-line reveal for display headlines. Each line slides up
 * from below its clip mask with a slight diagonal drift, staggered top to
 * bottom. Visual lines are aria-hidden; the parent heading must carry the
 * full string as its own aria-label (a plain span cannot hold an
 * accessible name), so screen readers hear one string.
 */
export type DiaLine = string | { text: string; className?: string };

function lineText(line: DiaLine): string {
  return typeof line === "string" ? line : line.text;
}

function lineClass(line: DiaLine): string {
  return typeof line === "string" ? "" : (line.className ?? "");
}

export function DiaReveal({
  lines,
  className,
  lineClassName,
  delay = 0,
  stagger = 0.12,
}: {
  lines: DiaLine[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return (
      <span className={className}>
        {lines.map((line, index) => (
          <span key={`${lineText(line)}-${index}`} className={`block ${lineClassName ?? ""} ${lineClass(line)}`}>
            {lineText(line)}
          </span>
        ))}
      </span>
    );
  }
  return (
    <>
      <span className={className}>
        {lines.map((line, index) => (
          <span key={`${lineText(line)}-${index}`} aria-hidden="true" className="block overflow-hidden pb-[0.09em]">
            <m.span
              className={`block will-change-transform ${lineClassName ?? ""} ${lineClass(line)}`}
              initial={{ y: "112%", x: "-3.5%", rotate: 1.6 }}
              whileInView={{ y: "0%", x: "0%", rotate: 0 }}
              viewport={{ once: true, margin: "-5% 0px" }}
              transition={{
                duration: 0.9,
                delay: delay + index * stagger,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {lineText(line)}
            </m.span>
          </span>
        ))}
      </span>
    </>
  );
}
