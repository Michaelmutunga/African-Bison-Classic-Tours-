import Image from "next/image";
import { cn } from "@/lib/cn";

const TONES = [
  "bg-ink text-ivory",
  "bg-earth-deep text-ivory",
  "bg-bark text-ivory",
  "bg-sand-deep text-ink",
  "bg-clay-deep text-ivory",
] as const;

/**
 * Editorial image frame. Pass `src` once photography is processed and it
 * renders next/image with correct sizes; without `src` it renders the
 * intentional placeholder (subtle texture, no photo claim). `quiet`
 * hides the caption line for hero-level slots.
 */
export function SafariImage({
  seed,
  label,
  alt,
  ratio = "aspect-[16/10]",
  className,
  src,
  focal = "50% 40%",
  priority = false,
  quiet = false,
  sizes,
}: {
  seed: string;
  label: string;
  alt: string;
  ratio?: string;
  className?: string;
  src?: string | null;
  focal?: string;
  priority?: boolean;
  quiet?: boolean;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", ratio, className)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          decoding="async"
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 40vw"}
          style={{ objectPosition: focal }}
          className="object-cover"
        />
      </div>
    );
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const tone = TONES[hash % TONES.length];
  const initial = label.trim().charAt(0).toUpperCase() || "A";

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        ratio,
        tone,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="font-display absolute text-[7rem] leading-none opacity-20 sm:text-[9rem]"
      >
        {initial}
      </span>
      <span aria-hidden="true" className="absolute inset-x-8 bottom-4 border-t border-current opacity-30" />
      {quiet ? null : (
        <span className="type-caption absolute bottom-6 px-4 text-center opacity-80">
          Photography coming soon
        </span>
      )}
    </div>
  );
}
