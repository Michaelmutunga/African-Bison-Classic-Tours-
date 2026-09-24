import { cn } from "@/lib/cn";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="type-label text-clay-deep">{eyebrow}</p>
      <h2 className="type-h2 mt-2 text-balance">{title}</h2>
      {lede ? <p className="type-body mt-3 text-ink/75">{lede}</p> : null}
    </div>
  );
}
