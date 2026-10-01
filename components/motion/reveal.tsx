"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Fade and rise on first entry, once. Content is always in the DOM;
 * motion only affects opacity and transform.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12% 0px" }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </m.div>
    </>
  );
}
