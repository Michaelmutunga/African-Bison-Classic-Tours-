"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogHeader } from "@/components/ui/dialog";

/** Accessible confirm dialog. Replaces window.confirm for destructive actions. */
export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "primary",
  onConfirm,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "primary" | "secondary";
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const labelId = `confirm-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant === "primary" ? "secondary" : "ghost"} size="sm" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={labelId}>
        <DialogHeader id={labelId} title={title} onClose={() => setOpen(false)} />
        <DialogBody>
          <p className="type-small text-ink/75">{description}</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Working…" : confirmLabel}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              Keep as is
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </>
  );
}
