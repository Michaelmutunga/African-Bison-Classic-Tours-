"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/**
 * Scroll-velocity marquee. A destination strip drifts at a base pace and
 * accelerates (or reverses) with the reader's scroll velocity. Decorative:
 * the region carries the label while the moving row is aria-hidden.
 * Reduced motion gets a static centered row.
 */
export function VelocityMarquee({ items, label }: { items: string[]; label: string }) {
  const reduced = usePrefersReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 90, damping: 30 });
  const skewed = useTransform(smooth, [-2500, 0, 2500], [-4, 0, 4]);
  const x = useTransform(baseX, (value) => `${value}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    const boost = smooth.get() / 900;
    if (Math.abs(boost) > 0.12) direction.current = boost > 0 ? 1 : -1;
    let next = baseX.get() - (direction.current * (0.55 + Math.abs(boost) * 2.4) * delta) / 100;
    if (next <= -50) next += 50;
    if (next > 0) next -= 50;
    baseX.set(next);
  });

  const row = [...items, ...items];

  if (reduced) {
    return (
      <div aria-label={label} className="overflow-hidden border-y border-ivory/10 bg-night py-5 text-ivory">
        <p className="type-label mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-2 px-5 text-center text-ivory/80">
          {items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </p>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div aria-label={label} className="overflow-hidden border-y border-ivory/10 bg-night py-5 text-ivory">
        <m.div className="flex w-max" style={{ x, skewX: skewed }} aria-hidden="true">
          {[0, 1].map((half) => (
            <div key={half} className="flex w-max shrink-0 items-center">
              {row.map((item, index) => (
                <span key={`${half}-${item}-${index}`} className="flex items-center">
                  <span className="type-label px-6 whitespace-nowrap text-ivory/80">{item}</span>
                  <span className="text-clay" aria-hidden="true">
                    ◆
                  </span>
                </span>
              ))}
            </div>
          ))}
        </m.div>
      </div>
    </LazyMotion>
  );
}
