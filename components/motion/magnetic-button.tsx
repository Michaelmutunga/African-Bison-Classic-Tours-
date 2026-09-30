"use client";

import { LazyMotion, domAnimation, m, useMotionValue, useSpring } from "motion/react";
import type { MouseEvent, ReactNode } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";
import { cn } from "@/lib/cn";

const styles = {
  primary:
    "bg-clay text-ivory hover:bg-clay-deep shadow-[0_18px_50px_-18px_rgb(0_0_0/0.7)]",
  secondary: "border border-ivory/60 bg-night/50 text-ivory hover:border-ivory hover:bg-night/70",
} as const;

/**
 * Interactive hover CTA. The button drifts toward the pointer (magnetic
 * pull with spring return) and lifts on hover. Plain link with the same
 * visual style when reduced motion is on; keyboard focus keeps the
 * visible global focus ring.
 */
export function MagneticCta({
  href,
  primary,
  children,
  className,
  label,
}: {
  href: string;
  primary?: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 160, damping: 14, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 160, damping: 14, mass: 0.4 });

  const base = cn(
    "type-label inline-flex items-center justify-center gap-2 rounded-[2px] px-7 py-3.5 normal-case transition-colors duration-300 will-change-transform",
    primary ? styles.primary : styles.secondary,
    className,
  );

  if (reduced) {
    return (
      <a href={href} aria-label={label} className={base}>
        {children}
      </a>
    );
  }

  const onMove = (event: MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - (rect.left + rect.width / 2)) * 0.22);
    rawY.set((event.clientY - (rect.top + rect.height / 2)) * 0.32);
  };
  const onLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.a
        href={href}
        aria-label={label}
        className={base}
        style={{ x, y }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {children}
      </m.a>
    </LazyMotion>
  );
}
