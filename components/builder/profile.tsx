import type { ProfileAxis } from "@/lib/builder";

export function SafariProfile({ axes }: { axes: ProfileAxis[] }) {
  return (
    <div aria-label="Your journey profile">
      <div className="grid gap-3">
        {axes.map((axis) => (
          <div key={axis.slug}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="type-small font-semibold">{axis.label}</p>
              <p className="type-caption text-ink/60">
                {axis.level}/5 · {axis.note}
              </p>
            </div>
            <div
              role="img"
              aria-label={`${axis.label}: ${axis.level} out of 5`}
              className="mt-1 h-1.5 w-full rounded-full bg-sand"
            >
              <div
                className="h-1.5 rounded-full bg-clay"
                style={{ width: `${(axis.level / 5) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="type-caption mt-3 text-ink/60">
        A visual summary of your choices — not a scientific score.
      </p>
    </div>
  );
}
