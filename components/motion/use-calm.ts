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

function computeCalm(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  const connection = (navigator as Navigator & { connection?: NetworkInfo })
    .connection;
  return connectionWantsStill(connection);
}

/**
 * True after the component mounts on the client. Render paths that differ
 * between server and client must wait for this, otherwise React hydration
 * fails because the server HTML does not match the first client render.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}

/**
 * True when the OS asks for reduced motion. Starts false (matching the
 * server render) and settles after mount, so no hydration mismatch.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = requestAnimationFrame(() => setReduced(media.matches));
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", onChange);
    };
  }, []);
  return reduced;
}

/**
 * True when motion and video should be skipped: reduced motion, data
 * saver, or 2g/3g connections. HeroMedia uses this to pick the still.
 * Starts false (matching the server render) and settles after mount.
 */
export function useCalmExperience(): boolean {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setCalm(computeCalm()));
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setCalm(computeCalm());
    media.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", onChange);
    };
  }, []);
  return calm;
}
