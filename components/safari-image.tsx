import { cn } from "@/lib/cn";

const TONES = [
  "bg-ink text-ivory",
  "bg-earth-deep text-ivory",
  "bg-bark text-ivory",
  "bg-sand-deep text-ink",
  "bg-clay-deep text-ivory",
] as const;

/**
 * Deterministic placeholder visual. Real licensed photography slots into
 * this exact frame later (same aspect + alt contract) without redesign.
 */
export function SafariImage({
  seed,
  label,
  alt,
  ratio = "aspect-[16/10]",
  className,
}: {
  seed: string;
  label: string;
  alt: string;
  ratio?: string;
  className?: string;
}) {
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
      <span className="type-caption absolute bottom-6 px-4 text-center opacity-80">
        Photography coming soon
      </span>
    </div>
  );
}
