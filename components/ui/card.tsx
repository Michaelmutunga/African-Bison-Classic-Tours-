import { cn } from "@/lib/cn";

/** Quiet editorial card: hairline border, near-square corners, no shadow. */
export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <article
      className={cn("rounded-[2px] border border-ink/15 bg-ivory", className)}
      {...rest}
    >
      {children}
    </article>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}
