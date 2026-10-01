"use client";

import { m, useScroll, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

function Word({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.22, 1]);
  return <m.span style={{ opacity }}>{word} </m.span>;
}

/**
 * Statement sentence whose words brighten as the reader scrolls.
 * Plain text when reduced motion is on.
 */
export function ScrollWords({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.4"],
  });
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (reduced) return <p className={className}>{text}</p>;
  return (
    <>
      <p ref={ref} className={className}>
        {words.map((word, index) => (
          <Word
            key={`${word}-${index}`}
            word={word}
            progress={scrollYProgress}
            range={[index / words.length, (index + 1) / words.length]}
          />
        ))}
      </p>
    </>
  );
}
