import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SafeUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { ConflictError, NotFoundError, type Actor } from "@/server/catalogue";
import { requireBookingAccess, travellerSchema } from "@/server/portal";
import { groupSummary, perPersonShare, travellerCompletion } from "@/lib/group-view";

type Owner = SafeUser | null;

export class GroupError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

// Bookings far enough along that the party is frozen.
const GROUP_LOCKED = ["ON_SAFARI", "COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED", "REFUND_PENDING"];

export const groupInput = z.object({
  name: z.string().trim().min(2).max(160),
  expectedTravellers: z.number().int().min(2).max(60).optional(),
});

export const inviteInput = z.object({
  emails: z.array(z.string().trim().email().max(254)).min(1).max(30),
});

function inviteToken(): string {
  return `inv_${randomBytes(24).toString("hex")}`;
}

async function requireGroupAccess(user: Owner, reference: string) {
  const booking = await requireBookingAccess(user, reference);
  const group = await prisma.group.findUnique({
    where: { bookingId: booking.id },
    include: {
      invites: { orderBy: { createdAt: "asc" }, include: { travellers: true } },
    },
  });
  if (!group) throw new NotFoundError("Group");
  return { booking, group };
}

export async function createGroup(user: Owner, reference: string, input: unknown) {
  const booking = await requireBookingAccess(user, reference);
  if (GROUP_LOCKED.includes(booking.status)) {
    throw new GroupError(`Groups cannot be changed while the safari is ${booking.status}`);
  }
  const data = groupInput.parse(input);
  const existing = await prisma.group.findUnique({ where: { bookingId: booking.id } });
  if (existing) throw new ConflictError("This booking already has a group");
  return prisma.group.create({
    data: { bookingId: booking.id, name: data.name, expectedTravellers: data.expectedTravellers ?? null },
  });
}

export async function inviteTravellers(user: Owner, reference: string, input: unknown) {
  const { booking, group } = await requireGroupAccess(user, reference);
  if (GROUP_LOCKED.includes(booking.status)) {
    throw new GroupError(`Groups cannot be changed while the safari is ${booking.status}`);
  }
  const data = inviteInput.parse(input);
  const invites = await prisma.$transaction(
    data.emails.map((email) =>
      prisma.groupInvite.create({
        data: { groupId: group.id, email: email.toLowerCase(), token: inviteToken() },
      }),
    ),
  );
  return invites;
}

export async function revokeInvite(user: Owner, inviteId: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
    include: { group: { include: { booking: true } } },
  });
  if (!invite) throw new NotFoundError("Invite");
  await requireBookingAccess(user, invite.group.booking.reference);
  if (GROUP_LOCKED.includes(invite.group.booking.status)) {
    throw new GroupError("Groups cannot be changed while the safari is underway");
  }
  return prisma.groupInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
}

// ---------------------------------------------------------------------------
// Token-gated traveller self-service. The token reveals exactly one invite,
// its group context, and the traveller record it created — nothing else.
// ---------------------------------------------------------------------------

export async function getInviteContext(token: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      group: {
        include: {
          booking: {
            include: {
              tour: { select: { slug: true, title: true } },
            },
          },
        },
      },
      travellers: true,
    },
  });
  if (!invite || invite.status === "REVOKED") throw new NotFoundError("Invite");
  if (GROUP_LOCKED.includes(invite.group.booking.status)) {
    throw new GroupError("This journey is closed to new details");
  }
  const booking = invite.group.booking;
  return {
    invite: { id: invite.id, email: invite.email, status: invite.status },
    group: { name: invite.group.name },
    booking: {
      reference: booking.reference,
      tourTitle: booking.tour?.title ?? "Custom journey",
      travelStart: booking.travelStart?.toISOString() ?? null,
      travelEnd: booking.travelEnd?.toISOString() ?? null,
    },
    traveller: invite.travellers[0] ?? null,
  };
}

export const acceptInviteSchema = travellerSchema.extend({
  roomPreference: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function acceptInvite(token: string, input: unknown, userId?: string) {
  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: { group: { include: { booking: true } }, travellers: true },
  });
  if (!invite || invite.status === "REVOKED") throw new NotFoundError("Invite");
  if (GROUP_LOCKED.includes(invite.group.booking.status)) {
    throw new GroupError("This journey is closed to new details");
  }
  const data = acceptInviteSchema.parse(input);
  const empty = (value: string | undefined) => (value ? value : null);
  const record = {
    fullName: data.fullName,
    kind: data.kind,
    email: empty(data.email),
    dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00Z`) : null,
    nationality: empty(data.nationality),
    passportNumber: empty(data.passportNumber),
    passportExpiry: data.passportExpiry ? new Date(`${data.passportExpiry}T00:00:00Z`) : null,
    emergencyContact: empty(data.emergencyContact),
    dietaryNotes: empty(data.dietaryNotes),
    medicalNotes: empty(data.medicalNotes),
    roomPreference: empty(data.roomPreference),
    userId: userId ?? null,
  };
  const existing = invite.travellers[0];
  const traveller = existing
    ? await prisma.bookingTraveller.update({ where: { id: existing.id }, data: record })
    : await prisma.bookingTraveller.create({
        data: { bookingId: invite.group.bookingId, inviteId: invite.id, ...record },
      });
  if (invite.status === "PENDING") {
    await prisma.groupInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  }
  return traveller;
}

// ---------------------------------------------------------------------------
// Organiser dashboard (aggregates + rooming info; passport and medical
// details stay operator-only in the Travellers tab / admin views).
// ---------------------------------------------------------------------------

export interface OrganiserTravellerRow {
  id: string;
  fullName: string;
  kind: string;
  email: string | null;
  roomPreference: string | null;
  invitedEmail: string | null;
  completion: ReturnType<typeof travellerCompletion>;
}

export async function groupDashboard(user: Owner, reference: string) {
  const { booking, group } = await requireGroupAccess(user, reference);
  const travellers = await prisma.bookingTraveller.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    include: { invite: { select: { email: true } } },
  });
  const rows: OrganiserTravellerRow[] = travellers.map((t) => ({
    id: t.id,
    fullName: t.fullName,
    kind: t.kind,
    email: t.email,
    roomPreference: t.roomPreference,
    invitedEmail: t.invite?.email ?? null,
    completion: travellerCompletion({
      fullName: t.fullName,
      nationality: t.nationality,
      passportNumber: t.passportNumber,
      emergencyContact: t.emergencyContact,
      roomPreference: t.roomPreference,
    }),
  }));
  const summary = groupSummary(travellers);
  const party = Math.max(booking.adults + booking.children, summary.total, group.expectedTravellers ?? 0);
  return {
    group: { id: group.id, name: group.name, expectedTravellers: group.expectedTravellers },
    booking: {
      reference: booking.reference,
      status: booking.status,
      tourTitle: booking.tour?.title ?? null,
    },
    invites: group.invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      status: invite.status,
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      token: invite.token,
    })),
    travellers: rows,
    summary,
    payment: {
      totalCents: booking.totalCents,
      paidCents: booking.paidCents,
      balanceCents: Math.max(0, booking.totalCents - booking.paidCents),
      perPersonCents: perPersonShare(booking.totalCents, party),
      currency: booking.currency,
    },
  };
}

export async function staffGroupInvite(actor: Actor | null, bookingId: string, emails: string[]) {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) {
    throw new ForbiddenError("bookings.write");
  }
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking");
  const group =
    (await prisma.group.findUnique({ where: { bookingId } })) ??
    (await prisma.group.create({
      data: { bookingId, name: `${booking.customerName} group` },
    }));
  const data = inviteInput.parse({ emails });
  return prisma.$transaction(
    data.emails.map((email) =>
      prisma.groupInvite.create({
        data: { groupId: group.id, email: email.toLowerCase(), token: inviteToken() },
      }),
    ),
  );
}
