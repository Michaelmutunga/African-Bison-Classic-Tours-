"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Lighter welcome for inner pages: headline mask reveal (about 0.8s).
 * No preloader, no session state, plain markup under reduced motion.
 */
export function PageIntro({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </m.div>
    </>
  );
}

/** Hero image settle: eases from scale 1.08 to 1 on inner pages. */
export function PageIntroMedia({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <>
      <m.div
        className={className}
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </m.div>
    </>
  );
}
