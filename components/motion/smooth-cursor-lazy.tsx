"use client";

import dynamic from "next/dynamic";

const SmoothCursor = dynamic(
  () => import("@/components/motion/smooth-cursor").then((m) => m.SmoothCursor),
  { ssr: false, loading: () => null },
);

export function SmoothCursorLazy() {
  return <SmoothCursor />;
}
