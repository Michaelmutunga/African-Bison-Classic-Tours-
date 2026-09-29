"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-calm";

/** App areas where smooth scroll never runs (dashboards, forms, auth). */
const CALM_ROUTES = [
  "/admin",
  "/dashboard",
  "/my-safaris",
  "/safari",
  "/profile",
  "/builder",
  "/login",
  "/register",
  "/invite",
];

/**
 * Lenis smooth-scroll provider. Renders nothing. Disabled when reduced
 * motion is on or on app routes. Adds `lenis-active` to <html> so CSS
 * can drop the conflicting native smooth scroll.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (CALM_ROUTES.some((route) => pathname?.startsWith(route))) return;

    const lenis = new Lenis({ duration: 1.1 });
    document.documentElement.classList.add("lenis-active");
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      document.documentElement.classList.remove("lenis-active");
    };
  }, [pathname, reduced]);

  return null;
}
