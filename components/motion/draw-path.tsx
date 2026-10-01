"use client";

import { m, useScroll } from "motion/react";
import { useId, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * SVG route line that draws itself on scroll. The path is always in
 * the DOM; motion only drives stroke-dashoffset via scaleX-mapped
 * pathLength. Provide a viewBox-sized path.
 */
export function DrawPath({
  d,
  className,
  labelledBy,
  title,
}: {
  d: string;
  className?: string;
  labelledBy?: string;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const pathId = useId();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });
  return (
    <>
      <div ref={ref}>
      <svg
        className={className}
        viewBox="0 0 800 220"
        fill="none"
        role="img"
        aria-labelledby={labelledBy ?? pathId}
      >
        {title ? <title id={labelledBy ?? pathId}>{title}</title> : null}
        {reduced ? (
          <path d={d} stroke="currentColor" strokeWidth={1.5} />
        ) : (
          <m.path
            d={d}
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ pathLength: scrollYProgress }}
          />
        )}
      </svg>
      </div>
    </>
  );
}
