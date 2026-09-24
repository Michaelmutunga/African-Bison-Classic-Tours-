import { cn } from "@/lib/cn";

export function DataTable({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-[2px] border border-ink/15", className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-ink/15 bg-parchment">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="type-label whitespace-nowrap px-4 py-3 font-semibold">
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-ink/10">{children}</tbody>;
}

export function TableCell({ numeric, children }: { numeric?: boolean; children: React.ReactNode }) {
  return (
    <td className={cn("type-small px-4 py-3", numeric && "type-numeric text-right")}>
      {children}
    </td>
  );
}
