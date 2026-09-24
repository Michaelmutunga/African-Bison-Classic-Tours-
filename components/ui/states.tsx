import { cn } from "@/lib/cn";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-ink/25 border-t-ink"
      />
      <span className="type-small text-ink/70">{label}…</span>
    </span>
  );
}

export function Skeleton({ className, label = "Loading content" }: { className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("animate-pulse rounded-[2px] bg-sand/70", className)}>
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[2px] border border-dashed border-ink/25 px-6 py-10 text-center">
      <p className="type-h3">{title}</p>
      {description ? <p className="type-small mx-auto mt-2 max-w-md text-ink/70">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem persists, contact African Bison Classic Tours.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-[2px] border border-clay/40 bg-clay/5 px-6 py-8 text-center">
      <p className="type-h3">{title}</p>
      <p className="type-small mx-auto mt-2 max-w-md text-ink/75">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="type-label mt-4 cursor-pointer text-clay-deep underline underline-offset-4"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
