import type { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, hasPermission, type Permission } from "@/lib/permissions";

export interface Actor {
  id: string;
  role: Role;
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
  }
}

function gate(actor: Actor | null, permission: Permission): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, permission)) throw new ForbiddenError(permission);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

// ---------------------------------------------------------------------------
// Validation schemas (every public boundary)
// ---------------------------------------------------------------------------

export const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(160).optional(),
});

export const destinationInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(160).optional(),
  country: z.string().trim().min(2).max(80),
  excerpt: z.string().trim().min(10).max(500),
  highlights: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  published: z.boolean().default(true),
});

export const itineraryDayInput = z.object({
  dayNumber: z.number().int().min(1).max(60),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(8000),
});

export const tourInput = z.object({
  title: z.string().trim().min(5).max(200),
  slug: z.string().trim().max(180).optional(),
  categoryId: z.string().cuid(),
  destinationIds: z.array(z.string().cuid()).max(12).default([]),
  durationDays: z.number().int().min(1).max(60),
  excerpt: z.string().trim().min(10).max(500),
  overview: z.array(z.string().trim().min(1).max(4000)).max(10).default([]),
  includes: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  excludes: z.array(z.string().trim().min(1).max(500)).max(30).default([]),
  published: z.boolean().default(false),
  days: z.array(itineraryDayInput).max(60).default([]),
});

export const activityInput = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  destination: z.string().trim().max(120).optional(),
  duration: z.string().trim().max(80).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default("USD"),
  capacity: z.number().int().min(1).nullable().optional(),
  published: z.boolean().default(true),
});

export const roomTypeInput = z.object({
  name: z.string().trim().min(2).max(120),
  capacity: z.number().int().min(1).nullable().optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default("USD"),
});

export const accommodationInput = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  location: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  boardBasis: z.string().trim().max(80).optional(),
  supplier: z.string().trim().max(160).optional(),
  status: z.string().trim().max(40).default("active"),
  roomTypes: z.array(roomTypeInput).max(20).default([]),
});

export const addOnInput = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  description: z.string().trim().max(2000).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default("USD"),
  published: z.boolean().default(true),
  tourIds: z.array(z.string().cuid()).max(50).default([]),
});

export const seasonInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(180).optional(),
  startsOn: z.string().trim().max(10).optional(),
  endsOn: z.string().trim().max(10).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const priceComponentInput = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  kind: z.string().trim().min(2).max(60),
  amountCents: z.number().int().min(0),
  currency: z.string().trim().length(3).default("USD"),
  perPerson: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Reads (public catalogue reads need no actor)
// ---------------------------------------------------------------------------

export async function listCategories() {
  return prisma.tourCategory.findMany({ orderBy: { name: "asc" } });
}

export async function listDestinations(publishedOnly: boolean) {
  return prisma.destination.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function getDestinationBySlug(slug: string, publishedOnly: boolean) {
  const destination = await prisma.destination.findUnique({ where: { slug } });
  if (!destination || (publishedOnly && !destination.published)) {
    throw new NotFoundError("Destination");
  }
  return destination;
}

export async function listTours(options: {
  categoryId?: string;
  publishedOnly: boolean;
  search?: string;
}) {
  const where: Prisma.TourProductWhereInput = {};
  if (options.publishedOnly) where.published = true;
  if (options.categoryId) where.categoryId = options.categoryId;
  if (options.search) where.title = { contains: options.search, mode: "insensitive" };
  return prisma.tourProduct.findMany({
    where,
    include: { category: true, destinations: true },
    orderBy: [{ durationDays: "asc" }, { title: "asc" }],
  });
}

export async function getTourBySlug(slug: string, publishedOnly: boolean) {
  const tour = await prisma.tourProduct.findUnique({
    where: { slug },
    include: {
      category: true,
      destinations: true,
      days: { orderBy: { dayNumber: "asc" } },
      addOns: { where: publishedOnly ? { published: true } : undefined },
    },
  });
  if (!tour || (publishedOnly && !tour.published)) throw new NotFoundError("Tour");
  return tour;
}

// ---------------------------------------------------------------------------
// Writes (permission-gated)
// ---------------------------------------------------------------------------

type SlugModel =
  | "tourCategory"
  | "destination"
  | "tourProduct"
  | "activity"
  | "accommodation"
  | "tourAddOn"
  | "season"
  | "priceComponent";

const slugFinders: Record<SlugModel, (slug: string) => Promise<{ id: string } | null>> = {
  tourCategory: (slug) => prisma.tourCategory.findUnique({ where: { slug }, select: { id: true } }),
  destination: (slug) => prisma.destination.findUnique({ where: { slug }, select: { id: true } }),
  tourProduct: (slug) => prisma.tourProduct.findUnique({ where: { slug }, select: { id: true } }),
  activity: (slug) => prisma.activity.findUnique({ where: { slug }, select: { id: true } }),
  accommodation: (slug) => prisma.accommodation.findUnique({ where: { slug }, select: { id: true } }),
  tourAddOn: (slug) => prisma.tourAddOn.findUnique({ where: { slug }, select: { id: true } }),
  season: (slug) => prisma.season.findUnique({ where: { slug }, select: { id: true } }),
  priceComponent: (slug) => prisma.priceComponent.findUnique({ where: { slug }, select: { id: true } }),
};

async function uniqueSlug(model: SlugModel, base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "item";
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing = await slugFinders[model](candidate);
    if (!existing || existing.id === ignoreId) return candidate;
  }
  throw new ConflictError(`Could not find a unique slug for "${base}"`);
}

export async function createCategory(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = categoryInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("tourCategory", data.name);
  try {
    return await prisma.tourCategory.create({ data: { name: data.name, slug } });
  } catch {
    throw new ConflictError(`Category slug "${slug}" already exists`);
  }
}

export async function createDestination(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = destinationInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("destination", data.name);
  try {
    return await prisma.destination.create({
      data: {
        name: data.name,
        slug,
        country: data.country,
        excerpt: data.excerpt,
        highlights: data.highlights,
        published: data.published,
      },
    });
  } catch {
    throw new ConflictError(`Destination slug "${slug}" already exists`);
  }
}

export async function updateDestination(actor: Actor | null, id: string, input: unknown) {
  gate(actor, "catalogue.write");
  const data = destinationInput.partial().parse(input);
  const existing = await prisma.destination.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Destination");
  const slug = data.slug ? slugify(data.slug) : data.name ? await uniqueSlug("destination", data.name, id) : undefined;
  try {
    return await prisma.destination.update({
      where: { id },
      data: { ...data, ...(slug ? { slug } : {}) },
    });
  } catch {
    throw new ConflictError("Destination slug already exists");
  }
}

function assertUniqueDays(days: { dayNumber: number }[]): void {
  const numbers = days.map((d) => d.dayNumber);
  if (new Set(numbers).size !== numbers.length) {
    throw new ConflictError("Itinerary day numbers must be unique within a tour");
  }
}

export async function createTour(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = tourInput.parse(input);
  assertUniqueDays(data.days);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("tourProduct", data.title);
  await prisma.tourCategory.findUniqueOrThrow({ where: { id: data.categoryId } }).catch(() => {
    throw new NotFoundError("Tour category");
  });
  try {
    return await prisma.tourProduct.create({
      data: {
        title: data.title,
        slug,
        categoryId: data.categoryId,
        destinations: { connect: data.destinationIds.map((id) => ({ id })) },
        durationDays: data.durationDays,
        excerpt: data.excerpt,
        overview: data.overview,
        includes: data.includes,
        excludes: data.excludes,
        published: false,
        days: {
          create: data.days.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            body: day.body,
          })),
        },
      },
      include: { days: { orderBy: { dayNumber: "asc" } } },
    });
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new ConflictError(`Tour slug "${slug}" already exists`);
  }
}

export async function updateTour(actor: Actor | null, id: string, input: unknown) {
  gate(actor, "catalogue.write");
  const data = tourInput.partial().parse(input);
  const existing = await prisma.tourProduct.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Tour");
  if (data.days) assertUniqueDays(data.days);
  const slug = data.slug
    ? slugify(data.slug)
    : data.title
      ? await uniqueSlug("tourProduct", data.title, id)
      : undefined;
  try {
    return await prisma.$transaction(async (tx) => {
      if (data.days) {
        await tx.itineraryDay.deleteMany({ where: { tourId: id } });
        await tx.itineraryDay.createMany({
          data: data.days.map((day) => ({
            tourId: id,
            dayNumber: day.dayNumber,
            title: day.title,
            body: day.body,
          })),
        });
      }
      return tx.tourProduct.update({
        where: { id },
        data: {
          ...(data.title ? { title: data.title } : {}),
          ...(slug ? { slug } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.destinationIds
            ? { destinations: { set: data.destinationIds.map((d) => ({ id: d })) } }
            : {}),
          ...(data.durationDays !== undefined ? { durationDays: data.durationDays } : {}),
          ...(data.excerpt ? { excerpt: data.excerpt } : {}),
          ...(data.overview ? { overview: data.overview } : {}),
          ...(data.includes ? { includes: data.includes } : {}),
          ...(data.excludes ? { excludes: data.excludes } : {}),
          ...(data.published !== undefined ? { published: data.published } : {}),
        },
        include: { days: { orderBy: { dayNumber: "asc" } } },
      });
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError) throw error;
    throw new ConflictError("Tour slug already exists");
  }
}

export async function setTourPublished(actor: Actor | null, id: string, published: boolean) {
  gate(actor, "catalogue.publish");
  const existing = await prisma.tourProduct.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Tour");
  return prisma.tourProduct.update({ where: { id }, data: { published } });
}

export async function deleteTour(actor: Actor | null, id: string) {
  gate(actor, "catalogue.write");
  const existing = await prisma.tourProduct.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Tour");
  await prisma.tourProduct.delete({ where: { id } });
}

export async function createActivity(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = activityInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("activity", data.name);
  try {
    return await prisma.activity.create({
      data: {
        name: data.name,
        slug,
        destination: data.destination ?? null,
        duration: data.duration ?? null,
        priceCents: data.priceCents ?? null,
        currency: data.currency,
        capacity: data.capacity ?? null,
        published: data.published,
      },
    });
  } catch {
    throw new ConflictError(`Activity slug "${slug}" already exists`);
  }
}

export async function updateActivity(actor: Actor | null, id: string, input: unknown) {
  gate(actor, "catalogue.write");
  const data = activityInput.partial().parse(input);
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Activity");
  const slug = data.slug ? slugify(data.slug) : data.name ? await uniqueSlug("activity", data.name, id) : undefined;
  try {
    return await prisma.activity.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
        priceCents: data.priceCents === undefined ? undefined : (data.priceCents ?? null),
        capacity: data.capacity === undefined ? undefined : (data.capacity ?? null),
      },
    });
  } catch {
    throw new ConflictError("Activity slug already exists");
  }
}

export async function listActivities(publishedOnly: boolean) {
  return prisma.activity.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createAccommodation(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = accommodationInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("accommodation", data.name);
  try {
    return await prisma.accommodation.create({
      data: {
        name: data.name,
        slug,
        location: data.location ?? null,
        category: data.category ?? null,
        boardBasis: data.boardBasis ?? null,
        supplier: data.supplier ?? null,
        status: data.status,
        roomTypes: {
          create: data.roomTypes.map((room) => ({
            name: room.name,
            capacity: room.capacity ?? null,
            priceCents: room.priceCents ?? null,
            currency: room.currency,
          })),
        },
      },
      include: { roomTypes: true },
    });
  } catch {
    throw new ConflictError(`Accommodation slug "${slug}" already exists`);
  }
}

export async function listAccommodations() {
  return prisma.accommodation.findMany({
    include: { roomTypes: true },
    orderBy: { name: "asc" },
  });
}

export async function createAddOn(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = addOnInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("tourAddOn", data.name);
  try {
    return await prisma.tourAddOn.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        priceCents: data.priceCents ?? null,
        currency: data.currency,
        published: data.published,
        tours: { connect: data.tourIds.map((id) => ({ id })) },
      },
    });
  } catch {
    throw new ConflictError(`Add-on slug "${slug}" already exists`);
  }
}

export async function listAddOns(publishedOnly: boolean) {
  return prisma.tourAddOn.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createSeason(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = seasonInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("season", data.name);
  try {
    return await prisma.season.create({
      data: {
        name: data.name,
        slug,
        startsOn: data.startsOn ?? null,
        endsOn: data.endsOn ?? null,
        notes: data.notes ?? null,
      },
    });
  } catch {
    throw new ConflictError(`Season slug "${slug}" already exists`);
  }
}

export async function listSeasons() {
  return prisma.season.findMany({ orderBy: { name: "asc" } });
}

export async function createPriceComponent(actor: Actor | null, input: unknown) {
  gate(actor, "catalogue.write");
  const data = priceComponentInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : await uniqueSlug("priceComponent", data.name);
  try {
    return await prisma.priceComponent.create({
      data: {
        name: data.name,
        slug,
        kind: data.kind,
        amountCents: data.amountCents,
        currency: data.currency,
        perPerson: data.perPerson,
        notes: data.notes ?? null,
      },
    });
  } catch {
    throw new ConflictError(`Price component slug "${slug}" already exists`);
  }
}

export async function listPriceComponents() {
  return prisma.priceComponent.findMany({ orderBy: { name: "asc" } });
}
