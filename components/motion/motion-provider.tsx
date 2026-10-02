"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Single LazyMotion provider for the whole app.
 * Leaf motion components use `m` directly so the domAnimation feature
 * set loads and evaluates once, not once per Reveal/PixelImage/etc.
 * Must render high in the tree (root layout) on marketing routes.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
