import { notFound } from "next/navigation";
import { TourForm } from "@/components/admin/tour-form";
import { listCategories, listDestinations } from "@/server/catalogue";
import { prisma } from "@/lib/prisma";

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tour, categories, destinations] = await Promise.all([
    prisma.tourProduct.findUnique({
      where: { id },
      include: { days: { orderBy: { dayNumber: "asc" } }, destinations: true },
    }),
    listCategories(),
    listDestinations(false),
  ]);
  if (!tour) notFound();

  return (
    <div className="max-w-3xl">
      <h2 className="type-h3">Edit tour</h2>
      <div className="mt-4">
        <TourForm
          categories={categories}
          destinations={destinations}
          initial={{
            id: tour.id,
            title: tour.title,
            categoryId: tour.categoryId,
            destinationIds: tour.destinations.map((d) => d.id),
            durationDays: tour.durationDays,
            excerpt: tour.excerpt,
            overview: tour.overview,
            includes: tour.includes,
            excludes: tour.excludes,
            published: tour.published,
            days: tour.days.map((day) => ({
              dayNumber: day.dayNumber,
              title: day.title,
              body: day.body,
            })),
          }}
        />
      </div>
    </div>
  );
}
