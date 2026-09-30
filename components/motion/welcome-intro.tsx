"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import { useEffect, useState } from "react";
import { useMounted, usePrefersReducedMotion } from "@/components/motion/use-calm";

const SESSION_KEY = "abct-intro-played";

function shouldShowIntro(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

/** True once the welcome overlay has played this session. */
export function hasPlayedIntro(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Homepage welcome overlay. Real content stays mounted underneath and
 * the h1 is never hidden: this is a fixed overlay that lifts like a
 * curtain (about 1.2s total), plays once per session, and is skipped
 * entirely for reduced motion. It mounts only on the client after
 * hydration, so the server HTML always matches. After the animation it
 * is removed from the DOM and never blocks pointer events.
 */
export function WelcomeIntro() {
  const mounted = useMounted();
  const reduced = usePrefersReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  // Render-time session read only: first render is always hidden, which
  // matches the server, so hydration never mismatches.
  const show = mounted && !reduced && !dismissed && shouldShowIntro();

  useEffect(() => {
    if (!show) return;
    // Safety net in case animation events never fire.
    const fallback = window.setTimeout(() => setDismissed(true), 2200);
    return () => window.clearTimeout(fallback);
  }, [show]);

  if (!show) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode: play again next visit, harmless.
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-night"
        initial={{ y: "0%" }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.55, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={dismiss}
      >
        <m.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            className="text-sand"
          >
            <m.circle
              cx="36"
              cy="36"
              r="32"
              stroke="currentColor"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            />
            <text
              x="36"
              y="42"
              textAnchor="middle"
              fill="currentColor"
              fontSize="22"
              fontFamily="Fraunces, Georgia, serif"
            >
              A
            </text>
          </svg>
          <p className="type-eyebrow text-sand">African Bison Classic Tours</p>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}
