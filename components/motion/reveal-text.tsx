"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Word-by-word masked headline reveal. The full string stays on the
 * parent as aria-label while visual words are aria-hidden, so screen
 * readers hear one string.
 */
export function RevealText({
  text,
  as: Tag = "span",
  className,
  stagger = 0.06,
}: {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  stagger?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const words = splitWords(text);
  if (reduced) return <Tag className={className}>{text}</Tag>;
  return (
    <LazyMotion features={domAnimation}>
      <Tag className={className} aria-label={text}>
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            aria-hidden="true"
            className="inline-block overflow-hidden pb-[0.08em] align-bottom"
          >
            <m.span
              className="inline-block will-change-transform"
              initial={{ y: "110%" }}
              whileInView={{ y: "0%" }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{
                duration: 0.7,
                delay: index * stagger,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {word}
              {index < words.length - 1 ? " " : ""}
            </m.span>
          </span>
        ))}
      </Tag>
    </LazyMotion>
  );
}
