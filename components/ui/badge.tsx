import { cn } from "@/lib/cn";

/** Restrained status badge. Never rely on colour alone — pair with text. */
type Tone = "neutral" | "sand" | "earth" | "clay" | "ink";

const tones: Record<Tone, string> = {
  neutral: "border-ink/20 text-ink",
  sand: "border-sand-deep bg-sand/40 text-ink",
  earth: "border-earth/40 bg-earth/10 text-earth-deep",
  clay: "border-clay/40 bg-clay/10 text-clay-deep",
  ink: "border-ink bg-ink text-ivory",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "type-label inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
