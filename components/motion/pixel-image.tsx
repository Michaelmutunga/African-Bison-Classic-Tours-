"use client";

import { m } from "motion/react";
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
          loading={priority ? undefined : "lazy"}
          decoding="async"
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
          style={{ objectPosition: focal }}
          className="object-cover"
        />
      </div>
    );
  }
  // Single-image settle (was: sharp + pixelated overlay of the same src,
  // which issued two downloads per card). One download per card now.
  return (
    <>
      <div className={cn("relative overflow-hidden", ratio, className)}>
        <m.div
          className="absolute inset-0"
          initial={{ scale: 1.07, opacity: 0.6 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            loading={priority ? undefined : "lazy"}
            decoding="async"
            sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
            style={{ objectPosition: focal }}
            className="object-cover"
          />
        </m.div>
      </div>
    </>
  );
}
