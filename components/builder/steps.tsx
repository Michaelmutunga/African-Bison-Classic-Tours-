"use client";

import Image from "next/image";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/field";
import { useBuilder } from "@/components/builder/builder-context";
import { ImageCheckCard, ImageRadioCard, StepHeading } from "@/components/builder/option-cards";
import {
  COMFORT_LEVELS,
  EXPERIENCES,
  INTERESTS,
  REGIONS,
  TRANSPORT_STYLES,
  TRAVEL_STYLES,
  tripDays,
} from "@/lib/builder";
import { imageById, imageForActivity, imageForBuilderOption, imageForDestination } from "@/lib/imagery";

const REGION_HINTS: Record<string, string> = {
  kenya: "Mara, Amboseli and Rift Valley lakes",
  tanzania: "Serengeti, Ngorongoro and Tarangire",
  "kenya-tanzania": "The full migration circuit",
  uganda: "Highland forest, planned with a specialist",
  beach: "Zanzibar sand after safari dust",
};

const REGION_CAPTIONS: Record<string, string | undefined> = {
  uganda: "Trek permits arranged separately with a specialist",
  beach: "Beach stays are quoted as an extension",
};

const EXPERIENCE_HINTS: Record<string, string> = {
  wildlife: "Game drives in golden light",
  "big-five": "Lion, leopard, elephant, buffalo, rhino country",
  migration: "River crossings in season",
  family: "Easy pace with room for everyone",
  honeymoon: "Private moments in wild places",
  luxury: "Top lodges and tented camps",
  adventure: "Long days, high trails",
  culture: "Meet the people who live here",
  photography: "Time, light and positioning",
  beach: "White sand after red dust",
  mountain: "Thin air and summit sunrises",
  private: "Your own vehicle and guide",
  group: "Small group, shared stories",
  corporate: "Teams out in the wild",
};

const INTEREST_HINTS: Record<string, string> = {
  elephants: "Amboseli herds especially",
  "big-cats": "Mara and Serengeti plains",
  rhino: "Nakuru and crater country",
  birds: "Lakes, rivers and forests",
  scenery: "Craters, highlands and plains",
  culture: "Villages, markets and stories",
  photography: "Light first, checklist second",
  migration: "Herds on the move",
  beach: "For the end of the trip",
  adventure: "Walk, climb, paddle",
};

const COMFORT_CAPTIONS: Record<string, string> = {
  luxury: "Lodges like the deck over the waterhole",
  "mid-range": "Comfortable lodges and tented camps",
  value: "Smart comfort, honest pricing",
};

const TRANSPORT_CAPTIONS: Record<string, string> = {
  "land-cruiser": "Pop-up roof, best for photography",
  "safari-van": "Great value on good roads",
  "fly-in": "Bush flights save long road days",
};

export interface BuilderStepData {
  destinations: { slug: string; name: string; country: string }[];
  addOns: { slug: string; name: string; description: string | null }[];
  seasons: { slug: string; name: string; startsOn: string | null; endsOn: string | null; notes: string | null }[];
}

function inSeason(dateISO: string, startsOn: string | null, endsOn: string | null): boolean {
  if (!startsOn || !endsOn || !dateISO) return false;
  const key = dateISO.slice(5);
  return startsOn <= endsOn ? key >= startsOn && key <= endsOn : key >= startsOn || key <= endsOn;
}

export function WhereStep() {
  const { draft, toggleItem } = useBuilder();
  return (
    <div>
      <StepHeading title="Where are you going?" lede="Pick one or combine. Gorilla treks and beach extensions are planned with a specialist." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Regions">
        {REGIONS.map((region) => (
          <ImageCheckCard
            key={region.slug}
            label={region.label}
            hint={REGION_HINTS[region.slug]}
            caption={REGION_CAPTIONS[region.slug]}
            image={imageForBuilderOption("region", region.slug)}
            checked={draft.regions.includes(region.slug)}
            onToggle={() => toggleItem("regions", region.slug)}
          />
        ))}
      </div>
    </div>
  );
}

export function ExperienceStep() {
  const { draft, toggleItem } = useBuilder();
  return (
    <div>
      <StepHeading title="What kind of experience?" lede="Optional. Pick everything that calls to you. It shapes your journey profile." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Experiences">
        {EXPERIENCES.map((experience) => (
          <ImageCheckCard
            key={experience.slug}
            label={experience.label}
            hint={EXPERIENCE_HINTS[experience.slug]}
            image={imageForBuilderOption("experience", experience.slug)}
            checked={draft.experiences.includes(experience.slug)}
            onToggle={() => toggleItem("experiences", experience.slug)}
          />
        ))}
      </div>
    </div>
  );
}

export function DatesStep({ seasons }: { seasons: BuilderStepData["seasons"] }) {
  const { draft, setField } = useBuilder();
  const days = tripDays(draft);
  const activeSeasons = seasons.filter(
    (season) =>
      (draft.startDate && inSeason(draft.startDate, season.startsOn, season.endsOn)) ||
      (draft.endDate && inSeason(draft.endDate, season.startsOn, season.endsOn)),
  );
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const toISO = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const seasonImage = imageById(
    activeSeasons.some((s) => s.slug === "migration-season")
      ? "migration-river-sunset"
      : activeSeasons.some((s) => s.slug === "calving-season")
        ? "serengeti-zebra-river"
        : activeSeasons.length > 0
          ? "nakuru-buffalo-flamingos"
          : "savanna-sunset-encounter",
  );
  return (
    <div>
      <StepHeading title="When are you travelling?" lede="Wildlife moves on its own schedule. Seasons below are guidance, never promises." />
      {seasonImage ? (
        <div className="relative mt-5 overflow-hidden rounded-[2px] bg-night">
          <div className="relative aspect-[21/9]">
            <Image
              src={seasonImage.src}
              alt={seasonImage.alt}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              style={{ objectPosition: seasonImage.focal }}
              className="object-cover"
            />
            <span aria-hidden="true" className="absolute inset-0" style={{ background: "var(--scrim)" }} />
            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="type-small block font-semibold text-ivory">
                {activeSeasons.length > 0 ? activeSeasons.map((s) => s.name).join(" · ") : "East Africa is year round"}
              </span>
              <span className="type-caption block text-ivory/80">Pick dates and the season finds you</span>
            </span>
          </div>
        </div>
      ) : null}
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 id="builder-start" className="type-h3">Start date</h3>
          <div className="mt-2">
            <Calendar
              labelledBy="builder-start"
              value={draft.startDate ? new Date(`${draft.startDate}T00:00:00`) : undefined}
              min={new Date(`${todayISO}T00:00:00`)}
              onChange={(date) => setField("startDate", toISO(date))}
            />
          </div>
        </div>
        <div>
          <h3 id="builder-end" className="type-h3">End date</h3>
          <div className="mt-2">
            <Calendar
              labelledBy="builder-end"
              value={draft.endDate ? new Date(`${draft.endDate}T00:00:00`) : undefined}
              min={draft.startDate ? new Date(`${draft.startDate}T00:00:00`) : new Date(`${todayISO}T00:00:00`)}
              onChange={(date) => setField("endDate", toISO(date))}
            />
          </div>
        </div>
      </div>
      {days > 0 ? (
        <p className="type-small mt-4" aria-live="polite">
          {days} day{days === 1 ? "" : "s"} — {draft.startDate || "…"} to {draft.endDate || "…"}
        </p>
      ) : null}
      {activeSeasons.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Matching seasons">
          {activeSeasons.map((season) => (
            <Badge key={season.slug} tone="earth" >
              {season.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Counter({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[2px] border border-ink/20 px-4 py-3">
      <Label htmlFor={id} className="mb-0">
        {label}
      </Label>
      <span className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Fewer ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="type-h3 size-9 cursor-pointer rounded-[2px] border border-ink/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <output id={id} aria-live="polite" className="type-h3 w-8 text-center type-numeric">
          {value}
        </output>
        <button
          type="button"
          aria-label={`More ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="type-h3 size-9 cursor-pointer rounded-[2px] border border-ink/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </span>
    </div>
  );
}

export function TravellersStep() {
  const { draft, setField } = useBuilder();
  const total = draft.adults + draft.children + draft.infants;
  const strip = ["travellers-safari-2", "group-serengeti-sign", "vehicle-guests-roof"]
    .map((id) => imageById(id))
    .filter((image): image is NonNullable<typeof image> => !!image);
  return (
    <div>
      <StepHeading title="Who is travelling?" lede="Counts shape vehicles, rooms and park fees. Exact details come later." />
      {strip.length > 0 ? (
        <div className="mt-5 grid grid-cols-3 gap-2" aria-hidden="true">
          {strip.map((image) => (
            <span key={image.id} className="relative block aspect-[4/3] overflow-hidden rounded-[2px] bg-night">
              <Image
                src={image.src}
                alt=""
                fill
                sizes="(max-width: 768px) 33vw, 200px"
                style={{ objectPosition: image.focal }}
                className="object-cover"
              />
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-5 grid max-w-xl gap-3">
        <Counter id="adults" label="Adults" value={draft.adults} min={1} max={16} onChange={(v) => setField("adults", v)} />
        <Counter id="children" label="Children (2–11)" value={draft.children} min={0} max={16} onChange={(v) => setField("children", v)} />
        <Counter id="infants" label="Infants (under 2)" value={draft.infants} min={0} max={6} onChange={(v) => setField("infants", v)} />
      </div>
      <p className="type-small mt-4 text-ink/70" aria-live="polite">
        {total} traveller{total === 1 ? "" : "s"} total.
      </p>
    </div>
  );
}

export function StyleStep() {
  const { draft, setField } = useBuilder();
  return (
    <div>
      <StepHeading title="How do you want to travel?" lede="Private means your own vehicle and guide. Shared joins a small group." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Travel style">
        {TRAVEL_STYLES.map((style) => (
          <ImageRadioCard
            key={style.slug}
            value={style.slug}
            label={style.label}
            hint={style.hint}
            image={imageForBuilderOption("experience", style.slug)}
            checked={draft.travelStyle === style.slug}
            onSelect={(value) => setField("travelStyle", value)}
          />
        ))}
      </div>
    </div>
  );
}

export function InterestsStep() {
  const { draft, toggleItem } = useBuilder();
  return (
    <div>
      <StepHeading title="What do you most want to see?" lede="Optional. Your planner uses this to weight game drives and stops. Sightings are never guaranteed." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Interests">
        {INTERESTS.map((interest) => (
          <ImageCheckCard
            key={interest.slug}
            label={interest.label}
            hint={INTEREST_HINTS[interest.slug]}
            image={imageForBuilderOption("interest", interest.slug)}
            checked={draft.interests.includes(interest.slug)}
            onToggle={() => toggleItem("interests", interest.slug)}
          />
        ))}
      </div>
    </div>
  );
}

export function DestinationsStep({ destinations }: { destinations: BuilderStepData["destinations"] }) {
  const { draft, toggleDestination, moveDestination } = useBuilder();
  const byCountry = new Map<string, typeof destinations>();
  for (const destination of destinations) {
    const list = byCountry.get(destination.country) ?? [];
    list.push(destination);
    byCountry.set(destination.country, list);
  }
  const selected = draft.destinationSlugs
    .map((slug) => destinations.find((d) => d.slug === slug))
    .filter((d): d is (typeof destinations)[number] => !!d);

  return (
    <div>
      <StepHeading title="Choose your stops — in travel order" lede="Tap a photo to add it. The order you add is the order you travel. Reorder below." />
      {selected.length > 0 ? (
        <ol aria-label="Your route in order" className="mt-5 grid gap-2">
          {selected.map((destination, index) => {
            const thumb = imageForDestination(destination.slug);
            return (
              <li
                key={destination.slug}
                className="flex items-center gap-3 rounded-[2px] border border-clay/50 bg-clay/5 px-3 py-2"
              >
                {thumb ? (
                  <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-[2px] bg-night">
                    <Image
                      src={thumb.src}
                      alt=""
                      fill
                      sizes="64px"
                      style={{ objectPosition: thumb.focal }}
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <span aria-hidden="true" className="type-label text-clay-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="type-small flex-1 font-semibold">{destination.name}</span>
                <button
                  type="button"
                  aria-label={`Move ${destination.name} earlier`}
                  disabled={index === 0}
                  onClick={() => moveDestination(destination.slug, -1)}
                  className="cursor-pointer px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${destination.name} later`}
                  disabled={index === selected.length - 1}
                  onClick={() => moveDestination(destination.slug, 1)}
                  className="cursor-pointer px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${destination.name}`}
                  onClick={() => toggleDestination(destination.slug)}
                  className="type-small cursor-pointer px-2 py-1 underline underline-offset-4"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className="mt-6 grid gap-6">
        {[...byCountry.entries()].map(([country, list]) => (
          <div key={country}>
            <h3 className="type-label text-ink/60">{country}</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2" role="group" aria-label={`${country} destinations`}>
              {list.map((destination) => (
                <ImageCheckCard
                  key={destination.slug}
                  label={destination.name}
                  hint={country}
                  image={imageForDestination(destination.slug)}
                  checked={draft.destinationSlugs.includes(destination.slug)}
                  onToggle={() => toggleDestination(destination.slug)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccommodationStep() {
  const { draft, setField } = useBuilder();
  return (
    <div>
      <StepHeading title="Where do you want to sleep?" lede="A level, not a specific lodge. Your confirmation always names the exact property (or similar, agreed with you)." />
      <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Comfort level">
        {COMFORT_LEVELS.map((level) => (
          <ImageRadioCard
            key={level.slug}
            value={level.slug}
            label={level.label}
            hint={level.hint}
            caption={COMFORT_CAPTIONS[level.slug]}
            image={imageForBuilderOption("comfort", level.slug)}
            checked={draft.comfort === level.slug}
            onSelect={(value) => setField("comfort", value)}
          />
        ))}
      </div>
    </div>
  );
}

export function TransportStep() {
  const { draft, setField } = useBuilder();
  return (
    <div>
      <StepHeading title="How do you want to get around?" lede="Land Cruisers suit photographers. Vans keep costs down. Bush flights save long road days." />
      <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Transport style">
        {TRANSPORT_STYLES.map((transport) => (
          <ImageRadioCard
            key={transport.slug}
            value={transport.slug}
            label={transport.label}
            hint={transport.hint}
            caption={TRANSPORT_CAPTIONS[transport.slug]}
            image={imageForBuilderOption("transport", transport.slug)}
            checked={draft.transport === transport.slug}
            onSelect={(value) => setField("transport", value)}
          />
        ))}
      </div>
    </div>
  );
}

export function ActivitiesStep({ addOns }: { addOns: BuilderStepData["addOns"] }) {
  const { draft, toggleItem } = useBuilder();
  if (addOns.length === 0) {
    return (
      <div>
        <StepHeading title="Optional experiences" lede="None are currently bookable online — your planner will suggest what fits your route." />
      </div>
    );
  }
  return (
    <div>
      <StepHeading title="Add optional experiences?" lede="Priced individually by your planner. Selecting here only flags interest." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Optional experiences">
        {addOns.map((addOn) => {
          const image =
            imageForBuilderOption("addon", addOn.slug) ?? imageForActivity(`${addOn.name} ${addOn.description ?? ""}`);
          return (
            <ImageCheckCard
              key={addOn.slug}
              label={addOn.name}
              hint={addOn.description ?? undefined}
              image={image}
              checked={draft.addOnSlugs.includes(addOn.slug)}
              onToggle={() => toggleItem("addOnSlugs", addOn.slug)}
            />
          );
        })}
      </div>
    </div>
  );
}
