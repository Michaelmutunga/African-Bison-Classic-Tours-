"use client";

import { m, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Gentle image parallax (about 8 percent) with a slow settle from
 * scale 1.08 to 1. Static image when reduced motion is on.
 */
export function Parallax({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <>
      <div ref={ref} className={className} style={{ overflow: "hidden" }}>
        <m.div style={{ y, scale }} className="h-full w-full will-change-transform">
          {children}
        </m.div>
      </div>
    </>
  );
}
