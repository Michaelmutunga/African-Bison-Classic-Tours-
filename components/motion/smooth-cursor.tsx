"use client";

import { LazyMotion, domAnimation, m, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Smooth trailing cursor ring for desktop fine pointers. The native
 * cursor stays visible and usable; this is a soft accent that follows
 * with spring lag and widens over links and buttons. Never renders on
 * touch pointers or when reduced motion is on.
 */
export function SmoothCursor() {
  const reduced = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const x = useSpring(rawX, { stiffness: 260, damping: 26, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 260, damping: 26, mass: 0.5 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    // Async flip (same hydration-safe pattern as useMounted): the server
    // and first client render agree on null before enabling.
    const frame = requestAnimationFrame(() => setEnabled(true));
    const onMove = (event: PointerEvent) => {
      rawX.set(event.clientX);
      rawY.set(event.clientY);
    };
    const onOver = (event: Event) => {
      const target = event.target as HTMLElement | null;
      setActive(Boolean(target?.closest?.("a, button, [role='button']")));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, [rawX, rawY]);

  if (reduced || !enabled) return null;
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[90] rounded-full border border-sand"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: active ? 52 : 30, height: active ? 52 : 30, opacity: 1 }}
        initial={{ width: 30, height: 30, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
    </LazyMotion>
  );
}
