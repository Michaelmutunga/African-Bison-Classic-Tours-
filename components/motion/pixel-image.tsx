"use client";

import { LazyMotion, domAnimation, m } from "motion/react";
import Image from "next/image";
import { SafariImage } from "@/components/safari-image";
import { useCalmExperience } from "@/components/motion/use-calm";
import { cn } from "@/lib/cn";

/**
 * Pixel-to-sharp image reveal. A tiny upscaled copy (pixelated by the
 * browser) sits over the full image and steps away in staggered fades
 * when the card enters view, while the sharp layer settles from a
 * slight zoom. Calm connections, reduced motion or missing photography
 * get the sharp image (or the honest placeholder) with no effect.
 */
export function PixelImage({
  src,
  alt,
  seed,
  label,
  focal = "50% 40%",
  ratio = "aspect-[4/3]",
  sizes,
  priority = false,
  quiet = false,
  className,
}: {
  src?: string | null;
  alt: string;
  seed: string;
  label: string;
  focal?: string;
  ratio?: string;
  sizes?: string;
  priority?: boolean;
  quiet?: boolean;
  className?: string;
}) {
  const calm = useCalmExperience();
  if (!src) {
    return (
      <SafariImage
        seed={seed}
        label={label}
        alt={alt}
        ratio={ratio}
        quiet={quiet}
        className={className}
      />
    );
  }
  if (calm) {
    return (
      <div className={cn("relative overflow-hidden", ratio, className)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
          style={{ objectPosition: focal }}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <LazyMotion features={domAnimation}>
      <div className={cn("relative overflow-hidden", ratio, className)}>
        <m.div
          className="absolute inset-0"
          initial={{ scale: 1.07 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
            style={{ objectPosition: focal }}
            className="object-cover"
          />
        </m.div>
        <m.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          whileInView={{ opacity: [1, 1, 0.85, 0.55, 0.25, 0] }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.9, times: [0, 0.25, 0.45, 0.65, 0.85, 1], ease: "linear" }}
        >
          <Image
            src={src}
            alt=""
            width={28}
            height={21}
            sizes="28px"
            style={{ objectPosition: focal }}
            className="pixelated h-full w-full object-cover"
          />
        </m.div>
      </div>
    </LazyMotion>
  );
}
