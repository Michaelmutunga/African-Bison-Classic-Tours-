"use client";

import { useEffect, useState } from "react";

type NetworkInfo = {
  saveData?: boolean;
  effectiveType?: string;
};

function connectionWantsStill(connection: NetworkInfo | undefined): boolean {
  if (!connection) return false;
  if (connection.saveData === true) return true;
  const type = (connection.effectiveType ?? "").toLowerCase();
  return type === "2g" || type === "3g" || type === "slow-2g";
}

function mediaReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function computeCalm(): boolean {
  if (typeof window === "undefined") return false;
  if (mediaReduced()) return true;
  const connection = (navigator as Navigator & { connection?: NetworkInfo })
    .connection;
  return connectionWantsStill(connection);
}

/** True when the OS asks for reduced motion. Safe for SSR. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(mediaReduced);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * True when motion and video should be skipped: reduced motion, data
 * saver, or 2g/3g connections. HeroMedia uses this to pick the still.
 */
export function useCalmExperience(): boolean {
  const [calm, setCalm] = useState(computeCalm);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setCalm(computeCalm());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return calm;
}
