import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full cursor-pointer appearance-none rounded-[2px] border border-ink/20 bg-ivory py-2.5 pl-3.5 pr-10 text-[1rem] text-ink",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%227%22%3E%3Cpath d=%22M1 1l5 5 5-5%22 fill=%22none%22 stroke=%22%2314120f%22 stroke-width=%221.5%22/%3E%3C/svg%3E')] bg-[position:right_0.9rem_center] bg-no-repeat",
        "hover:border-ink/40 aria-invalid:border-clay-deep",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
