"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export type DisplayCurrency = "USD" | "KES";

/** Global display-only currency switch. Persists in a cookie, never rewrites totals. */
export function CurrencyToggle({ value }: { value: DisplayCurrency }) {
  const router = useRouter();
  const [pending, setPending] = useState<DisplayCurrency | null>(null);

  async function switchTo(next: DisplayCurrency) {
    if (next === value) return;
    setPending(next);
    try {
      await fetch("/api/currency-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency: next }),
      });
    } catch {
      // Cookie write failed; still refresh so server state is shown.
    } finally {
      setPending(null);
      router.refresh();
    }
  }

  return (
    <div
      role="group"
      aria-label="Display currency"
      title="Display-only conversion. Billed totals never change."
      className="inline-flex rounded-[2px] border border-ink/20"
    >
      {(["USD", "KES"] as const).map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            disabled={pending !== null}
            onClick={() => void switchTo(option)}
            className={cn(
              "type-caption cursor-pointer px-3 py-1.5",
              active ? "bg-ink text-ivory" : "text-ink/70 hover:text-ink",
            )}
          >
            {pending === option ? "…" : option === "USD" ? "$ USD" : "KSh KES"}
          </button>
        );
      })}
    </div>
  );
}
