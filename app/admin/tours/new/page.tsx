import { TourForm } from "@/components/admin/tour-form";
import { listCategories, listDestinations } from "@/server/catalogue";

export default async function NewTourPage() {
  const [categories, destinations] = await Promise.all([
    listCategories(),
    listDestinations(false),
  ]);
  return (
    <div className="max-w-3xl">
      <h2 className="type-h3">New tour</h2>
      <p className="type-small mt-1 text-ink/70">
        Tours are created as drafts. Publishing is a separate, permission-gated step.
      </p>
      <div className="mt-4">
        <TourForm categories={categories} destinations={destinations} />
      </div>
    </div>
  );
}
