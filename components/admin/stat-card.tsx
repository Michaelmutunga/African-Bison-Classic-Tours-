import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";

/** Editorial stat tile: label, numeric value, optional link and helper line. */
export function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string;
  href?: string;
  hint?: string;
}) {
  const body = (
    <CardBody>
      <p className="type-label text-ink/60">{label}</p>
      <p className="type-h2 type-numeric mt-1">{value}</p>
      {hint ? <p className="type-caption mt-1 text-ink/60">{hint}</p> : null}
    </CardBody>
  );
  if (!href) {
    return <Card>{body}</Card>;
  }
  return (
    <Card className="transition-colors hover:border-ink/40">
      <Link href={href} aria-label={`${label}: ${value}`} className="block">
        {body}
      </Link>
    </Card>
  );
}
