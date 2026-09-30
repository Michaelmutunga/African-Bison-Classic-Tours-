"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@*+=<>";

/**
 * Hyper-text scramble label. Hover, keyboard focus or touch activation
 * scrambles the characters left to right before resolving to the final
 * text. Static text when reduced motion is on.
 */
export function HyperText({ text, className }: { text: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(text);
  const frame = useRef(0);
  const settled = useRef(true);

  const scramble = useCallback(() => {
    if (settled.current === false) return;
    settled.current = false;
    let progress = 0;
    const step = Math.max(1, Math.round(text.length / 14));
    const tick = () => {
      progress += step;
      if (progress >= text.length) {
        setDisplay(text);
        settled.current = true;
        return;
      }
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < progress) return char;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(""),
      );
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [text]);

  useEffect(() => {
    return () => cancelAnimationFrame(frame.current);
  }, []);

  if (reduced) return <span className={className}>{text}</span>;
  return (
    <span
      className={className}
      onMouseEnter={scramble}
      onFocus={scramble}
      onTouchStart={scramble}
      aria-hidden="true"
    >
      {display}
    </span>
  );
}
