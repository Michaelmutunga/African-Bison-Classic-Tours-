import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { ConflictError, NotFoundError, type Actor } from "@/server/catalogue";
import { hashPassword, type SafeUser } from "@/lib/auth";

export class PortalError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Registration + booking claim
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(200),
});

export async function registerCustomer(input: unknown) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError("An account with this email already exists");
  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      role: "CUSTOMER",
      passwordHash: await hashPassword(data.password),
    },
  });
  // Claim guest bookings made with the same email.
  const claimed = await prisma.booking.updateMany({
    where: { customerEmail: email, userId: null },
    data: { userId: user.id },
  });
  return { user, claimedCount: claimed.count };
}

// ---------------------------------------------------------------------------
// Ownership gate: owners (by id or email) and booking staff. Everyone else
// gets 404 — booking existence never leaks.
// ---------------------------------------------------------------------------

export async function requireBookingAccess(user: SafeUser | null, reference: string) {
  if (!user) throw new UnauthorizedError();
  const booking = await prisma.booking.findUnique({
    where: { reference: reference.toUpperCase() },
    include: {
      tour: {
        include: {
          category: true,
          destinations: true,
          days: { orderBy: { dayNumber: "asc" } },
        },
      },
      travellers: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" }, include: { refunds: true } },
      holds: true,
      messages: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking) throw new NotFoundError("Booking");
  const owner = booking.userId === user.id || booking.customerEmail === user.email;
  const staff = hasPermission(user.role, "bookings.write");
  if (!owner && !staff) throw new NotFoundError("Booking");
  return booking;
}

export type PortalBooking = Awaited<ReturnType<typeof requireBookingAccess>>;

export async function listMyBookings(user: SafeUser | null) {
  if (!user) throw new UnauthorizedError();
  return prisma.booking.findMany({
    where: { OR: [{ userId: user.id }, { customerEmail: user.email }] },
    orderBy: { createdAt: "desc" },
    include: {
      tour: { select: { slug: true, title: true } },
      travellers: { select: { id: true, passportNumber: true, nationality: true } },
    },
  });
}

// Pure view helpers live in lib/portal-view.ts (client-safe); re-exported
// here so server code has a single import surface.
export { bookingChecklist, journeyProgress, tripDayNumber } from "@/lib/portal-view";
export type { ChecklistInput, ChecklistItem } from "@/lib/portal-view";

// ---------------------------------------------------------------------------
// Travellers (owner-scoped)
// ---------------------------------------------------------------------------

export const travellerSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  kind: z.enum(["adult", "child", "infant"]).default("adult"),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  nationality: z.string().trim().max(80).optional().or(z.literal("")),
  passportNumber: z.string().trim().max(40).optional().or(z.literal("")),
  passportExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  emergencyContact: z.string().trim().max(200).optional().or(z.literal("")),
  dietaryNotes: z.string().trim().max(500).optional().or(z.literal("")),
  medicalNotes: z.string().trim().max(500).optional().or(z.literal("")),
});

const EDITABLE = ["NEW", "IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "CLIENT_REVISION", "AWAITING_PAYMENT", "PARTIALLY_PAID", "CONFIRMED"];

function toTravellerData(data: z.infer<typeof travellerSchema>) {
  const empty = (value: string | undefined) => (value ? value : null);
  return {
    fullName: data.fullName,
    kind: data.kind,
    email: empty(data.email) ,
    dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : null,
    nationality: empty(data.nationality),
    passportNumber: empty(data.passportNumber),
    passportExpiry: data.passportExpiry ? new Date(`${data.passportExpiry}T00:00:00Z`) : null,
    emergencyContact: empty(data.emergencyContact),
    dietaryNotes: empty(data.dietaryNotes),
    medicalNotes: empty(data.medicalNotes),
  };
}

export async function addTraveller(user: SafeUser | null, reference: string, input: unknown) {
  const booking = await requireBookingAccess(user, reference);
  if (!EDITABLE.includes(booking.status)) {
    throw new PortalError(`Travellers cannot be changed while the safari is ${booking.status}`);
  }
  const data = travellerSchema.parse(input);
  return prisma.bookingTraveller.create({ data: { bookingId: booking.id, ...toTravellerData(data) } });
}

export async function updateTraveller(user: SafeUser | null, travellerId: string, input: unknown) {
  const traveller = await prisma.bookingTraveller.findUnique({
    where: { id: travellerId },
    include: { booking: true },
  });
  if (!traveller) throw new NotFoundError("Traveller");
  await requireBookingAccess(user, traveller.booking.reference);
  if (!EDITABLE.includes(traveller.booking.status)) {
    throw new PortalError(`Travellers cannot be changed while the safari is ${traveller.booking.status}`);
  }
  const data = travellerSchema.partial().parse(input);
  return prisma.bookingTraveller.update({
    where: { id: travellerId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.kind !== undefined ? { kind: data.kind } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.dateOfBirth !== undefined
        ? { dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : null }
        : {}),
      ...(data.nationality !== undefined ? { nationality: data.nationality || null } : {}),
      ...(data.passportNumber !== undefined ? { passportNumber: data.passportNumber || null } : {}),
      ...(data.passportExpiry !== undefined
        ? { passportExpiry: data.passportExpiry ? new Date(`${data.passportExpiry}T00:00:00Z`) : null }
        : {}),
      ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact || null } : {}),
      ...(data.dietaryNotes !== undefined ? { dietaryNotes: data.dietaryNotes || null } : {}),
      ...(data.medicalNotes !== undefined ? { medicalNotes: data.medicalNotes || null } : {}),
    },
  });
}

export async function removeTraveller(user: SafeUser | null, travellerId: string) {
  const traveller = await prisma.bookingTraveller.findUnique({
    where: { id: travellerId },
    include: { booking: true },
  });
  if (!traveller) throw new NotFoundError("Traveller");
  await requireBookingAccess(user, traveller.booking.reference);
  if (!EDITABLE.includes(traveller.booking.status)) {
    throw new PortalError(`Travellers cannot be changed while the safari is ${traveller.booking.status}`);
  }
  await prisma.bookingTraveller.delete({ where: { id: travellerId } });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function postMessage(user: SafeUser | null, reference: string, input: unknown) {
  if (!user) throw new UnauthorizedError();
  const booking = await requireBookingAccess(user, reference);
  if (["CANCELLED", "EXPIRED", "REFUNDED"].includes(booking.status)) {
    throw new PortalError("This journey is closed to new messages");
  }
  const data = messageSchema.parse(input);
  const staff = hasPermission(user.role, "bookings.write");
  return prisma.customerMessage.create({
    data: {
      bookingId: booking.id,
      authorId: user.id,
      authorRole: staff ? "staff" : "customer",
      body: data.body,
    },
  });
}

export async function listMessages(user: SafeUser | null, reference: string) {
  const booking = await requireBookingAccess(user, reference);
  return prisma.customerMessage.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Documents: stored uploads + generated travel documents.
// ---------------------------------------------------------------------------

export interface PortalDocument {
  id: string;
  kind: string;
  title: string;
  url: string | null;
  createdAt: string;
}

export async function listDocuments(user: SafeUser | null, reference: string): Promise<PortalDocument[]> {
  const booking = await requireBookingAccess(user, reference);
  const docs: PortalDocument[] = booking.documents.map((d) => ({
    id: d.id,
    kind: d.kind,
    title: d.title,
    url: d.url,
    createdAt: d.createdAt.toISOString(),
  }));
  docs.push({
    id: "generated-confirmation",
    kind: "confirmation",
    title: "Booking confirmation",
    url: `/safari/${booking.reference}/confirmation`,
    createdAt: booking.createdAt.toISOString(),
  });
  if (booking.tour) {
    docs.push({
      id: "generated-itinerary",
      kind: "itinerary",
      title: "Trip itinerary",
      url: `/safari/${booking.reference}/itinerary`,
      createdAt: booking.createdAt.toISOString(),
    });
  }
  for (const payment of booking.payments.filter((p) => p.status === "SUCCEEDED")) {
    docs.push({
      id: `receipt-${payment.id}`,
      kind: "receipt",
      title: `Receipt — ${payment.kind.toLowerCase()} ${payment.amountCents / 100} ${payment.currency}`,
      url: `/api/payments/${payment.id}/receipt?email=${encodeURIComponent(booking.customerEmail)}`,
      createdAt: payment.createdAt.toISOString(),
    });
  }
  return docs;
}

export const documentSchema = z.object({
  bookingId: z.string().cuid(),
  kind: z.string().trim().min(2).max(40),
  title: z.string().trim().min(2).max(200),
  url: z.string().trim().url().max(2000).optional(),
  body: z.string().trim().max(8000).optional(),
});

export async function attachDocument(actor: Actor | null, input: unknown) {
  if (!actor || !hasPermission(actor.role, "bookings.write")) {
    throw new ForbiddenError("bookings.write");
  }
  const data = documentSchema.parse(input);
  const booking = await prisma.booking.findUnique({ where: { id: data.bookingId } });
  if (!booking) throw new NotFoundError("Booking");
  return prisma.document.create({
    data: {
      bookingId: booking.id,
      userId: booking.userId,
      kind: data.kind,
      title: data.title,
      url: data.url ?? null,
      body: data.body ?? null,
      createdById: actor.id,
    },
  });
}
