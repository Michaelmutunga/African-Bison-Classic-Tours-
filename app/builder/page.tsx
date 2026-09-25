import type { Metadata } from "next";
import { Builder } from "@/components/builder/builder";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Design your safari",
  description:
    "Build your own Kenya and Tanzania safari step by step — regions, dates, travellers, stops and experiences — then send it to a planner for a precise quote.",
};

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const [destinations, addOns, seasons] = await Promise.all([
    prisma.destination.findMany({
      where: { published: true },
      select: { slug: true, name: true, country: true },
      orderBy: [{ country: "asc" }, { name: "asc" }],
    }),
    prisma.tourAddOn.findMany({
      where: { published: true },
      select: { slug: true, name: true, description: true },
      orderBy: { name: "asc" },
    }),
    prisma.season.findMany({
      select: { slug: true, name: true, startsOn: true, endsOn: true, notes: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return <Builder data={{ destinations, addOns, seasons }} />;
}
