"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // jsdom (unit tests) lacks showModal; real browsers always take this path.
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open ]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: native dialog handles Escape
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "w-[min(32rem,calc(100vw-2rem))] rounded-[2px] border border-ink/15 bg-ivory p-0 text-ink",
        "backdrop:bg-ink/60",
        className,
      )}
    >
      {children}
    </dialog>
  );
}

export function DialogHeader({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-6">
      <h2 id={id} className="type-h3">
        {title}
      </h2>
      <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
        ✕
      </Button>
    </div>
  );
}

export function DialogBody({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-5 sm:px-6">{children}</div>;
}
