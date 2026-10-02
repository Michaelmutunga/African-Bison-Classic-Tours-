import { Container } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/states";

export default function DestinationsLoading() {
  return (
    <Container className="py-14" aria-label="Loading destinations" aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-10 max-w-xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
        <Skeleton className="aspect-[4/3]" />
      </div>
    </Container>
  );
}
