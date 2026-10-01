import { Container } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/states";

export default function BlogLoading() {
  return (
    <Container className="py-14" aria-label="Loading journal" aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-10 max-w-xl" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Skeleton className="aspect-[16/10]" />
        <Skeleton className="aspect-[16/10]" />
        <Skeleton className="aspect-[16/10]" />
      </div>
    </Container>
  );
}
