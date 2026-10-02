import { Container } from "@/components/ui/layout";
import { Skeleton } from "@/components/ui/states";

export default function BuilderLoading() {
  return (
    <Container className="py-14" aria-label="Loading safari designer" aria-busy="true">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-4 h-10 max-w-xl" />
      <Skeleton className="mt-8 h-64" />
    </Container>
  );
}
