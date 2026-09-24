"use client";

import { Dialog, DialogBody, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

/** Side panel built on the accessible Dialog primitive. */
export function Drawer({
  open,
  onClose,
  labelledBy,
  title,
  side = "right",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  title: string;
  side?: "right" | "left";
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={labelledBy}
      className={cn(
        "m-0 h-dvh max-h-none w-[min(26rem,calc(100vw-2rem))]",
        side === "right" ? "ml-auto" : "mr-auto",
      )}
    >
      <div className="flex h-dvh flex-col">
        <DialogHeader id={labelledBy} title={title} onClose={onClose} />
        <DialogBody>{children}</DialogBody>
      </div>
    </Dialog>
  );
}
