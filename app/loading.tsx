import { Container } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/states";

/** Instant navigation feedback: paints before DB-backed sections stream in. */
export default function RootLoading() {
  return (
    <div aria-label="Loading page" aria-busy="true">
      <div className="bg-night">
        <Container className="py-24 sm:py-32">
          <Skeleton className="h-5 w-48 bg-ivory/10" />
          <Skeleton className="mt-4 h-14 max-w-2xl bg-ivory/10" />
          <Skeleton className="mt-4 h-6 max-w-xl bg-ivory/10" />
        </Container>
      </div>
      <Container className="py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="aspect-[4/3]" />
        </div>
      </Container>
    </div>
  );
}
