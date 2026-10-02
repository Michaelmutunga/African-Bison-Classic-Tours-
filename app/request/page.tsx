import type { Metadata } from "next";
import { Container } from "@/components/ui/layout";
import { SubmissionForm } from "@/components/submission-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Request your safari",
  description:
    "Request a listed safari or describe a custom-designed trip. A planner replies with availability and a precise quote — nothing is booked or charged until you approve.",
};

export const dynamic = "force-dynamic";

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const { tour: tourSlug } = await searchParams;
  const tour = tourSlug
    ? await prisma.tourProduct.findUnique({
        where: { slug: tourSlug },
        select: { slug: true, title: true, durationDays: true, published: true },
      })
    : null;
  const destinations = await prisma.destination.findMany({
    where: { published: true },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <Container className="py-10">
      <p className="type-label text-clay-deep">Start here</p>
      <h1 className="type-h1 mt-2">Request your safari</h1>
      <p className="type-small mt-2 max-w-2xl text-ink/70">
        Tell us what you are dreaming of. Your request gets a traceable booking
        reference instantly, and a planner — a person, not a price bot — takes
        it from there.
      </p>
      <div className="mt-8 max-w-3xl">
        <SubmissionForm
          tour={tour && tour.published ? { slug: tour.slug, title: tour.title, durationDays: tour.durationDays } : undefined}
          destinations={destinations}
        />
      </div>
    </Container>
  );
}
