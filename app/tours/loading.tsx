import { Container } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/states";

export default function ToursLoading() {
  return (
    <Container className="py-14" aria-label="Loading safaris" aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-10 max-w-xl" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
      </div>
    </Container>
  );
}
