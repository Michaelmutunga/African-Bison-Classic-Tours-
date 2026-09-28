/**
 * Concierge engine (Phase 13). Deterministic, rule-based responder grounded
 * in retrieval.ts facts — no external LLM, no free-form database access.
 * The engine never invents prices, sightings, availability or policies;
 * anything outside the allowlist gets a refusal with a planner handoff.
 */
import { z } from "zod";
import { formatMoney } from "@/lib/money";
import type { SafeUser } from "@/lib/auth";
import {
  ConciergeError,
  NO_GUARANTEE_NOTE,
  isFinancialRequest,
  looksCustomerScoped,
  type IntentKind,
} from "@/server/concierge/policy";
import {
  contactPlannerProposalSchema,
  executeConfirmedAction,
  type ContactPlannerProposal,
} from "@/server/concierge/actions";
import {
  findOwnBooking,
  getPublicCatalog,
  listOwnBookings,
  type OwnBookingSummary,
  type PublicCatalog,
} from "@/server/concierge/retrieval";

export const conciergeRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  confirm: z.boolean().optional(),
  proposal: z.unknown().optional(),
  bookingReference: z
    .string()
    .trim()
    .max(32)
    .optional()
    .or(z.literal("")),
});

export interface ConciergeResponse {
  reply: string;
  intent: IntentKind;
  needsConfirmation?: boolean;
  proposal?: ContactPlannerProposal;
  confirmedReference?: string;
  sources: string[];
}

const REFERENCE_PATTERN = /ABCT-[A-Z0-9-]+/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
}

function overlapScore(messageWords: string[], candidate: string): number {
  const candidateWords = new Set(words(candidate));
  let score = 0;
  for (const word of messageWords) {
    if (candidateWords.has(word)) score += 1;
  }
  return score;
}

function detectIntent(message: string, user: SafeUser | null): IntentKind {
  const text = message.toLowerCase();
  if (/^(hi|hello|hey|jambo|good morning|good afternoon|good evening|thanks|thank you|asante)[\s!.]*$/.test(text)) {
    return "greet";
  }
  if (isFinancialRequest(message)) return "financial";
  if (/talk to|speak to|call me|call back|callback|human|real person|planner.*(call|contact)|contact.*planner/i.test(message)) {
    return "contact_planner";
  }
  const customerish =
    /my (booking|safari|trip|journey|payment|balance|guide|itinerary|transfer|pickup)|where.*(stay|staying)|tomorrow|tonight|how much.*(paid|owe)|game drive|passport|checklist|pack/i.test(
      message,
    ) || REFERENCE_PATTERN.test(message);
  if (customerish) {
    if (!user) return "need_auth";
    if (/itinerary|day.by.day|schedule|staying|tonight|tomorrow|game drive/i.test(message)) return "booking_itinerary";
    if (/paid|balance|deposit|owe|due|receipt/i.test(message)) return "booking_payment";
    if (/guide/i.test(message)) return "booking_guide";
    if (/pickup|pick.up|airport|transfer|arriv|flight/i.test(message)) return "booking_pickup";
    if (/checklist|pack|passport|document|prepar|ready/i.test(message)) return "booking_checklist";
    return "booking_status";
  }
  if (/pack|wear|bring|luggage|what to (bring|wear)/i.test(message)) return "packing";
  if (/phone|contact|email.*\?|office|address|where are you|opening|hours/i.test(message)) return "contact";
  if (/faq|visa|children|kids|family.*age|best time|when to (go|visit)|rainy season|safe|safety/i.test(message)) {
    return "faq";
  }
  if (/migration|wildebeest|mara river|crossing/i.test(message)) return "tours_list";
  // Snooping for staff/admin records or credentials is refused outright.
  if (/list all|all (users|bookings|customers|payments)|database|password|admin |revenue|profit|passport number|credit card/i.test(message)) {
    return "out_of_scope";
  }
  return "tours_list";
}

function formatDate(date: Date | null): string {
  if (!date) return "to be confirmed";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function bookingLine(booking: OwnBookingSummary): string {
  const dates =
    booking.travelStart && booking.travelEnd
      ? `${formatDate(booking.travelStart)} → ${formatDate(booking.travelEnd)}`
      : "dates to be confirmed";
  return `${booking.reference} · ${booking.tourTitle ?? "Custom journey"} · ${dates} · ${booking.status.replaceAll("_", " ")}`;
}

async function resolveBooking(
  user: SafeUser,
  message: string,
  bookingReference?: string,
): Promise<{ booking: OwnBookingSummary | null; clarification: string | null }> {
  const fromParam = bookingReference?.trim() ? bookingReference.trim() : null;
  const fromText = message.match(REFERENCE_PATTERN)?.[0] ?? null;
  const reference = fromParam ?? fromText;
  if (reference) {
    const booking = await findOwnBooking(user, reference);
    if (!booking) {
      return {
        booking: null,
        clarification: `I can't find booking ${reference.toUpperCase()} on your account. Check the reference in your safari portal, or ask me about another one.`,
      };
    }
    return { booking, clarification: null };
  }
  const own = await listOwnBookings(user);
  if (own.length === 0) {
    return { booking: null, clarification: "You don't have any bookings on this account yet — design a safari and I'll track it here." };
  }
  const first = own[0];
  if (!first) return { booking: null, clarification: "You don't have any bookings on this account yet." };
  if (own.length === 1) return { booking: first, clarification: null };
  return {
    booking: null,
    clarification: `You have ${own.length} journeys. Which one do you mean?\n${own.map((b) => `• ${bookingLine(b)}`).join("\n")}`,
  };
}

function checklistFor(booking: OwnBookingSummary): string[] {
  const items: string[] = [];
  const balance = booking.totalCents - booking.paidCents;
  if (balance > 0) items.push(`Settle the outstanding balance of ${formatMoney(balance, booking.currency)}.`);
  if (booking.travellersTotal === 0) {
    items.push("Add traveller details for everyone on the trip.");
  } else if (booking.travellersComplete < booking.travellersTotal) {
    items.push(
      `Complete passport details: ${booking.travellersComplete} of ${booking.travellersTotal} travellers done.`,
    );
  }
  if (!booking.travelStart) items.push("Confirm travel dates with your planner.");
  if (items.length === 0) items.push("Everything looks complete — check pickup times the evening before each travel day.");
  return items;
}

export async function handleMessage(
  user: SafeUser | null,
  input: unknown,
): Promise<ConciergeResponse> {
  const data = conciergeRequestSchema.parse(input);
  const { message } = data;

  // Confirmation step: execute ONLY the exact allowlisted proposal shape.
  if (data.confirm === true) {
    const parsed = contactPlannerProposalSchema.safeParse(data.proposal);
    if (!parsed.success) {
      throw new ConciergeError("That confirmation doesn't match anything I proposed. Please ask again in plain words.");
    }
    const { reference } = await executeConfirmedAction(user, parsed.data);
    return {
      reply: `Done — your planner callback is logged as ${reference}. A safari planner will reply by email, usually within one business day.`,
      intent: "contact_planner",
      confirmedReference: reference,
      sources: ["contact_inquiry"],
    };
  }

  const intent = detectIntent(message, user);

  if (intent === "greet") {
    return {
      reply: user
        ? `Hello ${user.name.split(" ")[0]}! Ask me about destinations, safaris, packing — or about your own booking, like "what's my balance?" or "where are we staying tonight?"`
        : "Hello! Ask me about East African destinations, our safaris, packing, or visas. Sign in and I can also help with your own booking.",
      intent,
      sources: [],
    };
  }

  if (intent === "financial") {
    return {
      reply:
        "I can't take payments, issue refunds, apply discounts or cancel bookings here — those always go through a person and our secure payment flow. " +
        "Your portal shows exactly what you've paid and what remains, or say “talk to a planner” and I'll log a callback.",
      intent,
      sources: [],
    };
  }

  if (intent === "need_auth" || (looksCustomerScoped(message) && !user)) {
    return {
      reply: "That's about your personal booking, so please sign in first — then I can look up your itinerary, balance, guide and pickup details.",
      intent: "need_auth",
      sources: [],
    };
  }

  if (intent === "contact_planner") {
    const email = message.match(EMAIL_PATTERN)?.[0];
    const name = user?.name ?? "Website guest";
    const contactEmail = email ?? (user ? user.email : null);
    if (!contactEmail) {
      return {
        reply: "Of course — a planner will call you back. Just reply with your email address and one line on what you'd like to plan (dates, destinations, travellers).",
        intent,
        sources: [],
      };
    }
    const topic = message.replace(EMAIL_PATTERN, "").replace(/\s+/g, " ").trim().slice(0, 200) || "Safari planning callback";
    const proposal: ContactPlannerProposal = {
      kind: "contact_planner",
      name,
      email: contactEmail,
      topic,
      message: `Callback requested via concierge: ${topic}`,
    };
    return {
      reply: `I can log a planner callback for ${contactEmail} about “${topic}”. Reply “yes” to confirm and I'll file it — nothing happens until you confirm.`,
      intent,
      needsConfirmation: true,
      proposal,
      sources: ["contact_inquiry:draft"],
    };
  }

  const catalog: PublicCatalog = await getPublicCatalog();
  const messageWords = words(message);

  if (intent === "destinations_list") {
    if (catalog.destinations.length === 0) {
      return { reply: "Our destination guides are being updated — a planner can still brief you on anywhere in Kenya and Tanzania.", intent, sources: ["destinations"] };
    }
    const names = catalog.destinations.map((d) => `${d.name} (${d.country})`).join(", ");
    return {
      reply: `We travel across Kenya and Tanzania, including: ${names}. Name any of them and I'll tell you what makes it special.`,
      intent,
      sources: ["destinations"],
    };
  }

  if (intent === "contact") {
    return {
      reply: `You can reach African Bison Classic Tours on ${catalog.contact.phonePrimary} or ${catalog.contact.email}. We're at ${catalog.contact.address}.`,
      intent,
      sources: ["site_settings"],
    };
  }

  if (intent === "packing") {
    return {
      reply: "Pack light, neutral-coloured layers for cold early-morning game drives, a warm fleece, sun hat, sunscreen, binoculars and a camera with spare batteries. Soft bags beat hard suitcases on safari vehicles. Full checklist lives in your safari portal once you book.",
      intent,
      sources: ["travel_info"],
    };
  }

  // Public detail: best-matching published record, or an honest miss.
  const bestDestination = catalog.destinations
    .map((d) => ({ record: d, score: overlapScore(messageWords, `${d.name} ${d.country} ${d.excerpt}`) }))
    .filter((d) => d.score >= 1)
    .sort((a, b) => b.score - a.score)[0];
  if (bestDestination && (intent === "destination_detail" || bestDestination.score >= 2)) {
    const d = bestDestination.record;
    const highlights = d.highlights.length > 0 ? ` Highlights: ${d.highlights.slice(0, 4).join("; ")}.` : "";
    return {
      reply: `${d.name} (${d.country}): ${d.excerpt}.${highlights}`,
      intent: "destination_detail",
      sources: [`destination:${d.slug}`],
    };
  }

  if (intent === "faq") {
    const best = catalog.faqs
      .map((f) => ({ record: f, score: overlapScore(messageWords, `${f.question} ${f.answer}`) }))
      .filter((f) => f.score >= 1)
      .sort((a, b) => b.score - a.score)[0];
    if (best) {
      return { reply: best.record.answer, intent, sources: ["faqs"] };
    }
  }

  if (intent === "tours_list" || intent === "tour_detail") {
    const best = catalog.tours
      .map((t) => ({ record: t, score: overlapScore(messageWords, `${t.title} ${t.excerpt} ${t.destinations.join(" ")}`) }))
      .filter((t) => t.score >= 1)
      .sort((a, b) => b.score - a.score)[0];
    if (best && (intent === "tour_detail" || best.score >= 2)) {
      const t = best.record;
      const places = t.destinations.length > 0 ? ` via ${t.destinations.join(", ")}` : "";
      const migration = /migration|mara|serengeti/i.test(`${t.title} ${t.excerpt}`) ? ` ${NO_GUARANTEE_NOTE}` : "";
      return {
        reply: `${t.title} — ${t.durationDays} days${places}. ${t.excerpt}.${migration} I never quote prices here; open the tour page or ask for a tailored quote.`,
        intent: "tour_detail",
        sources: [`tour:${t.slug}`],
      };
    }
    if (catalog.tours.length === 0) {
      return { reply: "Our published safaris are being updated — tell me your dates and interests and I'll have a planner sketch options.", intent: "tours_list", sources: ["tours"] };
    }
    const picks = catalog.tours.slice(0, 5).map((t) => `${t.title} (${t.durationDays} days)`).join("; ");
    const migrationNote = /migration/i.test(message) ? ` ${NO_GUARANTEE_NOTE}` : "";
    return {
      reply: `Popular right now: ${picks}.${migrationNote} Name one for the day-by-day plan, or use “Design your safari” for a custom route.`,
      intent: "tours_list",
      sources: ["tours"],
    };
  }

  // Customer intents (authenticated from here on).
  if (user && intent.startsWith("booking_")) {
    const reference = data.bookingReference?.trim() ? data.bookingReference.trim() : undefined;
    const { booking, clarification } = await resolveBooking(user, message, reference);
    if (!booking) {
      return { reply: clarification ?? "I couldn't find that booking.", intent, sources: [] };
    }
    const source = `booking:${booking.reference}`;
    if (intent === "booking_status") {
      return { reply: `Your journey: ${bookingLine(booking)}.`, intent, sources: [source] };
    }
    if (intent === "booking_payment") {
      const balance = Math.max(0, booking.totalCents - booking.paidCents);
      return {
        reply:
          `For ${booking.reference}: paid ${formatMoney(booking.paidCents, booking.currency)}, ` +
          `outstanding ${formatMoney(balance, booking.currency)} of ${formatMoney(booking.totalCents, booking.currency)} total. ` +
          "Receipts live in your safari portal. I can't take payments here — use the portal or talk to a planner.",
        intent,
        sources: [source],
      };
    }
    if (intent === "booking_itinerary") {
      if (booking.itinerary.length === 0) {
        return { reply: `Your day-by-day plan for ${booking.reference} is still being finalised with your planner — check the portal for the latest version.`, intent, sources: [source] };
      }
      const days = booking.itinerary.slice(0, 8).map((d) => `Day ${d.dayNumber}: ${d.title}`).join("\n");
      const more = booking.itinerary.length > 8 ? `\n…and ${booking.itinerary.length - 8} more days in your portal.` : "";
      return { reply: `Your route for ${booking.reference}:\n${days}${more}`, intent, sources: [source] };
    }
    if (intent === "booking_guide") {
      if (booking.guides.length === 0) {
        return { reply: `No guide is assigned to ${booking.reference} yet — your planner confirms the crew before departure.`, intent, sources: [source] };
      }
      const lines = booking.guides.map((g) => `${g.name}${g.phone ? ` — ${g.phone}` : ""}${g.languages.length > 0 ? ` (${g.languages.join(", ")})` : ""}`);
      return { reply: `Your guide for ${booking.reference}: ${lines.join("; ")}.`, intent, sources: [source] };
    }
    if (intent === "booking_pickup") {
      const upcoming = booking.transfers.filter((t) => t.status === "scheduled").slice(0, 3);
      if (upcoming.length === 0) {
        return { reply: `No pickups are scheduled for ${booking.reference} yet — airport transfers are confirmed with your planner before travel.`, intent, sources: [source] };
      }
      const lines = upcoming.map(
        (t) => `${formatDate(t.scheduledAt)}: ${t.pickup} → ${t.dropoff}`,
      );
      return { reply: `Pickups for ${booking.reference}:\n${lines.join("\n")}`, intent, sources: [source] };
    }
    const items = checklistFor(booking);
    return { reply: `Pre-trip checklist for ${booking.reference}:\n• ${items.join("\n• ")}`, intent: "booking_checklist", sources: [source] };
  }

  return {
    reply: "I can help with destinations, safaris, packing, visas and contact details — and, once you're signed in, your own itinerary, balance, guide and pickups. I can't process payments or refunds. What would you like to know?",
    intent: "out_of_scope",
    sources: [],
  };
}
