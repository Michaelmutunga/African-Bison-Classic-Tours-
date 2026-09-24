import { Container } from "@/components/ui/layout";

/** Shared editorial page shell: eyebrow, title, lede, then page content. */
export function MarketingShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="pt-12 sm:pt-16">
      <p className="type-label text-clay-deep">{eyebrow}</p>
      <h1 className="type-h1 mt-2 max-w-3xl text-balance">{title}</h1>
      {lede ? <p className="type-body mt-4 text-ink/75">{lede}</p> : null}
      <div className="mt-10">{children}</div>
    </Container>
  );
}
