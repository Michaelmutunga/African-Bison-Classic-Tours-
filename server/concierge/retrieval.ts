/**
 * Scoped concierge retrieval (Phase 13). The ONLY database reads the
 * concierge may perform. Public scope sees published catalogue + FAQs +
 * business contact settings. Customer scope additionally sees the caller's
 * OWN bookings (by user id or account email) — never anyone else's, never
 * passport numbers, never payment credentials, never staff/admin records.
 */
import { prisma } from "@/lib/prisma";
import type { SafeUser } from "@/lib/auth";

export interface PublicCatalog {
  destinations: { slug: string; name: string; country: string; excerpt: string; highlights: string[] }[];
  tours: {
    slug: string;
    title: string;
    durationDays: number;
    excerpt: string;
    category: string;
    destinations: string[];
  }[];
  faqs: { question: string; answer: string }[];
  contact: { phonePrimary: string; phoneSecondary: string; email: string; address: string };
}

export async function getPublicCatalog(): Promise<PublicCatalog> {
  const [destinations, tours, faqs, settings] = await Promise.all([
    prisma.destination.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      take: 30,
      select: { slug: true, name: true, country: true, excerpt: true, highlights: true },
    }),
    prisma.tourProduct.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        slug: true,
        title: true,
        durationDays: true,
        excerpt: true,
        category: { select: { name: true } },
        destinations: { select: { name: true } },
      },
    }),
    prisma.faq.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      take: 30,
      select: { question: true, answer: true },
    }),
    prisma.siteSetting.findMany({
      where: {
        key: { in: ["business.phonePrimary", "business.phoneSecondary", "business.email", "business.address"] },
      },
      select: { key: true, value: true },
    }),
  ]);
  const setting = (key: string, fallback: string) =>
    settings.find((s) => s.key === key)?.value ?? fallback;
  return {
    destinations,
    tours: tours.map((t) => ({
      slug: t.slug,
      title: t.title,
      durationDays: t.durationDays,
      excerpt: t.excerpt,
      category: t.category.name,
      destinations: t.destinations.map((d) => d.name),
    })),
    faqs,
    contact: {
      phonePrimary: setting("business.phonePrimary", "+254734466432"),
      phoneSecondary: setting("business.phoneSecondary", "+254111234567"),
      email: setting("business.email", "info@africanbisonclassictours.com"),
      address: setting("business.address", "JKIA Airport, 1st Floor, Suite 1, Nairobi, Kenya"),
    },
  };
}

export interface OwnBookingSummary {
  id: string;
  reference: string;
  status: string;
  tourTitle: string | null;
  travelStart: Date | null;
  travelEnd: Date | null;
  adults: number;
  children: number;
  infants: number;
  currency: string;
  totalCents: number;
  paidCents: number;
  depositCents: number;
  itinerary: { dayNumber: number; title: string; body: string }[];
  guides: { name: string; phone: string | null; languages: string[] }[];
  transfers: { pickup: string; dropoff: string; scheduledAt: Date; status: string }[];
  travellersComplete: number;
  travellersTotal: number;
}

/**
 * Owner-scoped booking lookup. Matches by user id or account email, exactly
 * like the customer portal — a reference belonging to someone else simply
 * does not resolve, so its existence never leaks.
 */
export async function findOwnBooking(user: SafeUser, reference: string): Promise<OwnBookingSummary | null> {
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
    include: {
      tour: {
        select: {
          title: true,
          days: { orderBy: { dayNumber: "asc" }, select: { dayNumber: true, title: true, body: true } },
        },
      },
      guideAssignments: {
        select: { guide: { select: { name: true, phone: true, languages: true } } },
      },
      transfers: {
        orderBy: { scheduledAt: "asc" },
        select: { pickup: true, dropoff: true, scheduledAt: true, status: true },
      },
      travellers: { select: { id: true, passportNumber: true } },
    },
  });
  if (!booking) return null;
  const owner = booking.userId === user.id || booking.customerEmail === user.email;
  if (!owner) return null;
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    tourTitle: booking.tour?.title ?? null,
    travelStart: booking.travelStart,
    travelEnd: booking.travelEnd,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
    currency: booking.currency,
    totalCents: booking.totalCents,
    paidCents: booking.paidCents,
    depositCents: booking.depositCents,
    itinerary: booking.tour?.days ?? [],
    guides: booking.guideAssignments.map((a) => a.guide),
    transfers: booking.transfers,
    travellersComplete: booking.travellers.filter((t) => t.passportNumber).length,
    travellersTotal: booking.travellers.length,
  };
}

export async function listOwnBookings(user: SafeUser): Promise<OwnBookingSummary[]> {
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ userId: user.id }, { customerEmail: user.email }] },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      tour: {
        select: {
          title: true,
          days: { orderBy: { dayNumber: "asc" }, select: { dayNumber: true, title: true, body: true } },
        },
      },
      guideAssignments: {
        select: { guide: { select: { name: true, phone: true, languages: true } } },
      },
      transfers: {
        orderBy: { scheduledAt: "asc" },
        select: { pickup: true, dropoff: true, scheduledAt: true, status: true },
      },
      travellers: { select: { id: true, passportNumber: true } },
    },
  });
  return bookings.map((booking) => ({
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    tourTitle: booking.tour?.title ?? null,
    travelStart: booking.travelStart,
    travelEnd: booking.travelEnd,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
    currency: booking.currency,
    totalCents: booking.totalCents,
    paidCents: booking.paidCents,
    depositCents: booking.depositCents,
    itinerary: booking.tour?.days ?? [],
    guides: booking.guideAssignments.map((a) => a.guide),
    transfers: booking.transfers,
    travellersComplete: booking.travellers.filter((t) => t.passportNumber).length,
    travellersTotal: booking.travellers.length,
  }));
}
