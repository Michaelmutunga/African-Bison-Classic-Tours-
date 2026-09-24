import Link from "next/link";
import { Container } from "@/components/ui/layout";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <Container>
      <nav aria-label="Breadcrumb" className="pt-6">
        <ol className="type-caption flex flex-wrap items-center gap-1.5 text-ink/60">
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="underline underline-offset-4 hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </Container>
  );
}
