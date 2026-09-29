"use client";

import { LazyMotion, domAnimation, m, useScroll, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/** Slim fixed scroll progress indicator. Decorative, hidden from AT. */
export function ScrollProgress() {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  if (reduced) return null;
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-clay"
        style={{ scaleX }}
      />
    </LazyMotion>
  );
}
