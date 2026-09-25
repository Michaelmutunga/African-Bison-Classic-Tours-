import { z } from "zod";

/**
 * Design-Your-Safari domain (Phase 4).
 *
 * The generator is deterministic and dependency-free so it can be unit-tested
 * and later reused server-side (quotes, reservations). No prices here:
 * monetary quotation is the Phase 5 pricing engine.
 */

export const REGIONS = [
  { slug: "kenya", label: "Kenya" },
  { slug: "tanzania", label: "Tanzania" },
  { slug: "kenya-tanzania", label: "Kenya + Tanzania" },
  { slug: "uganda", label: "Uganda (gorilla trek)" },
  { slug: "beach", label: "Zanzibar / beach extension" },
] as const;

export const EXPERIENCES = [
  { slug: "wildlife", label: "Wildlife" },
  { slug: "big-five", label: "Big Five" },
  { slug: "migration", label: "Great Migration" },
  { slug: "family", label: "Family" },
  { slug: "honeymoon", label: "Honeymoon" },
  { slug: "luxury", label: "Luxury" },
  { slug: "adventure", label: "Adventure" },
  { slug: "culture", label: "Culture" },
  { slug: "photography", label: "Photography" },
  { slug: "beach", label: "Beach" },
  { slug: "mountain", label: "Mountain" },
  { slug: "private", label: "Private safari" },
  { slug: "group", label: "Group safari" },
  { slug: "corporate", label: "Corporate" },
] as const;

export const INTERESTS = [
  { slug: "elephants", label: "Elephants" },
  { slug: "big-cats", label: "Big cats" },
  { slug: "rhino", label: "Rhino" },
  { slug: "birds", label: "Birds" },
  { slug: "scenery", label: "Scenery" },
  { slug: "culture", label: "Culture" },
  { slug: "photography", label: "Photography" },
  { slug: "migration", label: "Migration" },
  { slug: "beach", label: "Beach" },
  { slug: "adventure", label: "Adventure" },
] as const;

export const TRAVEL_STYLES = [
  { slug: "private", label: "Private", hint: "Your own vehicle and guide" },
  { slug: "shared", label: "Shared", hint: "Join a small group" },
] as const;

export const COMFORT_LEVELS = [
  { slug: "luxury", label: "Luxury", hint: "Top lodges and tented camps" },
  { slug: "mid-range", label: "Mid-range", hint: "Comfortable lodges and camps" },
  { slug: "value", label: "Value", hint: "Smart comfort, honest pricing" },
] as const;

export const TRANSPORT_STYLES = [
  { slug: "land-cruiser", label: "4x4 Safari Land Cruiser", hint: "Pop-up roof, best for photography" },
  { slug: "safari-van", label: "Safari van", hint: "Great value on good roads" },
  { slug: "fly-in", label: "Fly-in", hint: "Bush flights between parks" },
] as const;

export const builderDraftSchema = z.object({
  regions: z.array(z.string()).min(1, "Choose at least one region").max(5),
  experiences: z.array(z.string()).max(14).default([]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
  adults: z.number().int().min(1).max(16),
  children: z.number().int().min(0).max(16),
  infants: z.number().int().min(0).max(6),
  travelStyle: z.string().min(1, "Choose private or shared"),
  comfort: z.string().min(1, "Choose a comfort level"),
  interests: z.array(z.string()).max(10).default([]),
  destinationSlugs: z.array(z.string()).min(1, "Choose at least one destination").max(10),
  addOnSlugs: z.array(z.string()).max(12).default([]),
  transport: z.string().min(1, "Choose how you travel"),
});

export type BuilderDraft = z.infer<typeof builderDraftSchema>;

export const EMPTY_DRAFT: BuilderDraft = {
  regions: [],
  experiences: [],
  startDate: "",
  endDate: "",
  adults: 2,
  children: 0,
  infants: 0,
  travelStyle: "",
  comfort: "",
  interests: [],
  destinationSlugs: [],
  addOnSlugs: [],
  transport: "",
};

export function tripDays(draft: Pick<BuilderDraft, "startDate" | "endDate">): number {
  if (!draft.startDate || !draft.endDate) return 0;
  const start = new Date(`${draft.startDate}T00:00:00Z`);
  const end = new Date(`${draft.endDate}T00:00:00Z`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Number.isFinite(diff) ? diff : 0;
}

export function validateDraft(draft: BuilderDraft): string[] {
  const errors: string[] = [];
  const parsed = builderDraftSchema.safeParse(draft);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(issue.message);
  }
  const days = tripDays(draft);
  if (draft.startDate && draft.endDate && days < 2) {
    errors.push("Trips need at least 2 days (end date after start date)");
  }
  if (days > 30) errors.push("Trips over 30 days are planned directly with us — send an enquiry");
  const total = draft.adults + draft.children + draft.infants;
  if (total > 18) errors.push("Groups over 18 travel as group safaris — send an enquiry");
  if (draft.startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${draft.startDate}T00:00:00Z`) < today) {
      errors.push("Start date is in the past");
    }
  }
  return [...new Set(errors)];
}

// ---------------------------------------------------------------------------
// Itinerary generation
// ---------------------------------------------------------------------------

export interface GeneratedLeg {
  kind: "arrival" | "stay" | "transfer" | "departure";
  text: string;
}

export interface GeneratedDay {
  n: number;
  date: string;
  destinationSlug: string | null;
  destinationName: string;
  title: string;
  legs: GeneratedLeg[];
  activities: string[];
  meals: string;
  stay: string;
}

export interface GeneratedItinerary {
  days: GeneratedDay[];
  route: { slug: string; name: string; nights: number }[];
  totalDays: number;
}

export interface DestinationInfo {
  slug: string;
  name: string;
}

function toISODate(base: string, offset: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/**
 * Distribute trip days across destinations in travel order. Every stop gets
 * at least one day; leftover days go to the earliest stops first.
 */
export function allocateNights(totalDays: number, stops: number): number[] {
  if (stops <= 0) return [];
  const nights = new Array<number>(stops).fill(1);
  let remaining = totalDays - stops;
  let i = 0;
  while (remaining > 0) {
    nights[i % stops] = (nights[i % stops] ?? 1) + 1;
    remaining -= 1;
    i += 1;
  }
  return nights;
}

export function generateItinerary(
  draft: BuilderDraft,
  destinations: DestinationInfo[],
  addOnNames: Map<string, string>,
): GeneratedItinerary {
  const parsed = builderDraftSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(`Invalid draft: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  const days = tripDays(draft);
  if (days < 2) throw new Error("Trips need at least 2 days");

  const bySlug = new Map(destinations.map((d) => [d.slug, d.name]));
  const stops = draft.destinationSlugs.map(
    (slug) => ({ slug, name: bySlug.get(slug) ?? slug }),
  );
  const nights = allocateNights(days, stops.length);
  const comfortLabel =
    COMFORT_LEVELS.find((c) => c.slug === draft.comfort)?.label ?? draft.comfort;

  const generated: GeneratedDay[] = [];
  const addOnList = draft.addOnSlugs
    .map((slug) => addOnNames.get(slug))
    .filter((name): name is string => !!name);

  // Optional experiences attach once, on the first full (non-arrival,
  // non-departure) day — or day one when the trip has no full days.
  const addOnDay = days > 2 ? 2 : 1;

  let dayNumber = 0;
  stops.forEach((stop, stopIndex) => {
    const stopNights = nights[stopIndex] ?? 1;
    for (let i = 0; i < stopNights; i++) {
      dayNumber += 1;
      const isFirst = dayNumber === 1;
      const isLast = dayNumber === days;
      const legs: GeneratedLeg[] = [];
      if (isFirst) {
        legs.push({ kind: "arrival", text: "Airport pickup and transfer to your stay" });
      } else if (i === 0) {
        const prev = stops[stopIndex - 1];
        legs.push({
          kind: "transfer",
          text: `Travel ${prev?.name ?? "previous stop"} → ${stop.name} with game drive en route`,
        });
      }
      if (isLast) {
        legs.push({ kind: "departure", text: "Transfer to the airport for departure" });
      } else {
        legs.push({ kind: "stay", text: `Game drives and activities in ${stop.name}` });
      }
      generated.push({
        n: dayNumber,
        date: toISODate(draft.startDate, dayNumber - 1),
        destinationSlug: stop.slug,
        destinationName: stop.name,
        title:
          isFirst && days > 1
            ? `Arrival — ${stop.name}`
            : isLast
              ? `Departure — ${stop.name}`
              : `${stop.name} — day ${i + 1} of ${stopNights}`,
        legs,
        activities: dayNumber === addOnDay ? [...addOnList] : [],
        meals: isFirst || isLast ? "Bed & breakfast" : "Full board (breakfast, lunch, dinner)",
        stay: `${comfortLabel} stay in ${stop.name} (or similar — confirmed before you pay)`,
      });
    }
  });

  return {
    days: generated,
    route: stops.map((stop, index) => ({
      slug: stop.slug,
      name: stop.name,
      nights: nights[index] ?? 1,
    })),
    totalDays: days,
  };
}

// ---------------------------------------------------------------------------
// Journey profile (visual preference summary, not a scoring system)
// ---------------------------------------------------------------------------

export interface ProfileAxis {
  slug: string;
  label: string;
  level: number; // 1–5
  note: string;
}

export function journeyProfile(draft: BuilderDraft): ProfileAxis[] {
  const has = (...slugs: string[]) =>
    draft.experiences.some((e) => slugs.includes(e)) ||
    draft.interests.some((e) => slugs.includes(e));
  const comfortLevel =
    draft.comfort === "luxury" ? 5 : draft.comfort === "mid-range" ? 3 : draft.comfort === "value" ? 2 : 3;
  const days = Math.max(tripDays(draft), 1);
  const pace = Math.min(5, Math.max(1, Math.round(days / Math.max(draft.destinationSlugs.length, 1))));
  return [
    {
      slug: "wildlife",
      label: "Wildlife focus",
      level: has("wildlife", "big-five", "migration", "elephants", "big-cats", "rhino") ? 5 : 3,
      note: "From your experiences and interests",
    },
    {
      slug: "photography",
      label: "Photography",
      level: has("photography") ? 5 : 2,
      note: "From your experiences and interests",
    },
    {
      slug: "comfort",
      label: "Comfort",
      level: comfortLevel,
      note: "From your accommodation level",
    },
    {
      slug: "pace",
      label: "Pace",
      level: pace >= 3 ? 2 : 4,
      note: pace >= 3 ? "Relaxed — time in each stop" : "Active — covering ground",
    },
    {
      slug: "culture",
      label: "Culture",
      level: has("culture") ? 5 : 2,
      note: "From your experiences and interests",
    },
    {
      slug: "adventure",
      label: "Adventure",
      level: has("adventure", "mountain", "beach") ? 4 : 2,
      note: "From your experiences and interests",
    },
  ];
}

export function draftSummary(draft: BuilderDraft, destinationNames: Map<string, string>): string {
  const stops = draft.destinationSlugs.map((s) => destinationNames.get(s) ?? s).join(" → ");
  const travellers = [
    `${draft.adults} adult${draft.adults === 1 ? "" : "s"}`,
    ...(draft.children > 0 ? [`${draft.children} ${draft.children === 1 ? "child" : "children"}`] : []),
    ...(draft.infants > 0 ? [`${draft.infants} infant${draft.infants === 1 ? "" : "s"}`] : []),
  ].join(", ");
  return [
    `Regions: ${draft.regions.join(", ")}`,
    `Route: ${stops}`,
    `Dates: ${draft.startDate} to ${draft.endDate} (${tripDays(draft)} days)`,
    `Travellers: ${travellers}`,
    `Style: ${draft.travelStyle}, ${draft.comfort}; transport ${draft.transport}`,
    draft.experiences.length > 0 ? `Experiences: ${draft.experiences.join(", ")}` : null,
    draft.interests.length > 0 ? `Interests: ${draft.interests.join(", ")}` : null,
    draft.addOnSlugs.length > 0 ? `Add-ons: ${draft.addOnSlugs.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const BUILDER_STORAGE_KEY = "abct-builder-draft-v1";

// Stored drafts are mid-flow by definition (no dates, unpicked radios, no
// stops), so the restore schema only checks shapes. Step gating validates
// semantics when the flow continues.
const storedDraftSchema = builderDraftSchema.extend({
  regions: z.array(z.string()).max(5),
  startDate: z.string().max(10),
  endDate: z.string().max(10),
  travelStyle: z.string().max(40),
  comfort: z.string().max(40),
  transport: z.string().max(40),
  destinationSlugs: z.array(z.string()).max(10),
});

/** Restore a persisted draft; falls back to EMPTY_DRAFT on any problem. */
export function restoreDraft(raw: unknown): BuilderDraft {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return EMPTY_DRAFT;
    }
  }
  const parsed = storedDraftSchema.safeParse(raw);
  if (!parsed.success) return EMPTY_DRAFT;
  return { ...EMPTY_DRAFT, ...parsed.data };
}
