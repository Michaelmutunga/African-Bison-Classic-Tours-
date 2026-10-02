"use client";

import Image from "next/image";
import { useId } from "react";
import { SpinningText } from "@/components/motion/spinning-text";
import { cn } from "@/lib/cn";

const RING_TEXT = "AFRICAN BISON CLASSIC TOURS • • • ";

/**
 * Orbital brand mark: the buffalo logo art sits upright and static at
 * the centre while the business name orbits around it on a slow ring.
 * Colour follows the header state via `tone`; the ring is decorative
 * (aria-hidden inside SpinningText) and the link carries the name.
 */
export function BrandOrbit({
  tone,
  badgeClassName,
  logoSize = 72,
}: {
  tone: string;
  badgeClassName?: string;
  logoSize?: number;
}) {
  const pathId = `brand-ring-${useId().replace(/:/g, "")}`;
  return (
    <SpinningText
      href="/"
      label="African Bison Classic Tours — home"
      text={RING_TEXT}
      pathId={pathId}
      tone={tone}
      ringLength={232}
      ringClassName="font-display italic"
      className={cn("h-[112px] w-[112px]", badgeClassName)}
      center={
        <Image
          src="/images/brand/logo-192.png"
          alt=""
          width={logoSize}
          height={logoSize}
          sizes={`${logoSize}px`}
          style={{ width: logoSize, height: logoSize }}
          className="shrink-0"
          priority
        />
      }
    />
  );
}
