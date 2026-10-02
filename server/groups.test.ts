import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { groupSummary, perPersonShare, travellerCompletion } from "@/lib/group-view";
import { ConflictError, NotFoundError } from "@/server/catalogue";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { addTraveller, registerCustomer, removeTraveller } from "@/server/portal";
import { testActor, unique } from "@/tests/db";
import {
  GroupError,
  acceptInvite,
  createGroup,
  getInviteContext,
  groupDashboard,
  inviteTravellers,
  revokeInvite,
} from "@/server/groups";

const admin = testActor("ADMIN");

async function ownerWithBooking(partySize = 2) {
  const email = `${unique("gowner")}@example.com`;
  const booking = await createBooking(null, {
    customerName: "Group Organiser",
    customerEmail: email,
    adults: partySize,
    currency: "USD",
    subtotalCents: 1_000_000,
    totalCents: 1_000_000,
    depositCents: 300_000,
  });
  const { user } = await registerCustomer({
    name: "Group Organiser",
    email,
    password: "Group-Password-123!",
  });
  const me = { id: user.id, email: user.email, name: user.name, role: user.role, isActive: true };
  return { booking, me, user, email };
}

async function cleanup(ownerId: string, bookingId: string) {
  await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  await prisma.booking.delete({ where: { id: bookingId } }).catch(() => undefined);
}

describe("group creation", () => {
  it("creates one group per booking and rejects duplicates", async () => {
    const { booking, me } = await ownerWithBooking();
    const group = await createGroup(me, booking.reference, { name: "Test Group", expectedTravellers: 6 });
    expect(group.name).toBe("Test Group");
    await expect(createGroup(me, booking.reference, { name: "Again" })).rejects.toThrow(ConflictError);
    await expect(createGroup(null, booking.reference, { name: "Anon" })).rejects.toThrow();
    await cleanup(me.id, booking.id);
  });
});

describe("invitations", () => {
  it("issues tokens and accepts details through them", async () => {
    const { booking, me } = await ownerWithBooking();
    await createGroup(me, booking.reference, { name: "Invite Group" });
    const [invite] = await inviteTravellers(me, booking.reference, { emails: ["guest-one@example.com"] });
    expect(invite?.token).toMatch(/^inv_/);
    if (!invite) throw new Error("invite missing");

    const context = await getInviteContext(invite.token);
    expect(context.group.name).toBe("Invite Group");
    expect(context.traveller).toBeNull();

    const traveller = await acceptInvite(invite.token, {
      fullName: "Guest One",
      kind: "adult",
      nationality: "Kenyan",
      passportNumber: "G1111111",
      emergencyContact: "Mum +254700000001",
      roomPreference: "Twin share with Guest Two",
    });
    expect(traveller.roomPreference).toBe("Twin share with Guest Two");
    expect(traveller.inviteId).toBe(invite.id);

    const revisit = await getInviteContext(invite.token);
    expect(revisit.traveller?.fullName).toBe("Guest One");

    // Same token updates the same record (no duplicates).
    await acceptInvite(invite.token, {
      fullName: "Guest One",
      kind: "adult",
      nationality: "Kenyan",
      passportNumber: "G1111111",
      emergencyContact: "Mum +254700000001",
      roomPreference: "Single room",
    });
    expect(
      await prisma.bookingTraveller.count({ where: { bookingId: booking.id } }),
    ).toBe(1);
    await cleanup(me.id, booking.id);
  });

  it("revokes invites and rejects unknown tokens", async () => {
    const { booking, me } = await ownerWithBooking();
    await createGroup(me, booking.reference, { name: "Revoke Group" });
    const [invite] = await inviteTravellers(me, booking.reference, { emails: ["gone@example.com"] });
    if (!invite) throw new Error("invite missing");
    await revokeInvite(me, invite.id);
    await expect(getInviteContext(invite.token)).rejects.toThrow(NotFoundError);
    await expect(acceptInvite(invite.token, { fullName: "Ghost", kind: "adult" })).rejects.toThrow(NotFoundError);
    await expect(getInviteContext("inv_doesnotexist")).rejects.toThrow(NotFoundError);
    await cleanup(me.id, booking.id);
  });

  it("validates invite input", async () => {
    const { booking, me } = await ownerWithBooking();
    await createGroup(me, booking.reference, { name: "Valid Group" });
    await expect(inviteTravellers(me, booking.reference, { emails: ["not-an-email"] })).rejects.toThrow();
    await expect(inviteTravellers(me, booking.reference, { emails: [] })).rejects.toThrow();
    await cleanup(me.id, booking.id);
  });
});

describe("completion tracking and redaction", () => {
  it("computes per-traveller completion purely", () => {
    expect(
      travellerCompletion({ fullName: "A", nationality: null, passportNumber: null, emergencyContact: null, roomPreference: null }).complete,
    ).toBe(false);
    expect(
      travellerCompletion({
        fullName: "Amina Yusuf",
        nationality: "Kenyan",
        passportNumber: "A1",
        emergencyContact: "Mum",
        roomPreference: "Single",
      }),
    ).toEqual({ details: true, passport: true, emergency: true, room: true, complete: true });
    expect(perPersonShare(1_000_000, 4)).toBe(250_000);
    expect(perPersonShare(1_000_000, 0)).toBe(1_000_000);
  });

  it("shows organisers aggregates without private contents", async () => {
    const { booking, me } = await ownerWithBooking();
    await createGroup(me, booking.reference, { name: "Redact Group", expectedTravellers: 3 });
    const [invite] = await inviteTravellers(me, booking.reference, { emails: ["private@example.com"] });
    if (!invite) throw new Error("invite missing");
    await acceptInvite(invite.token, {
      fullName: "Private Person",
      kind: "adult",
      nationality: "Kenyan",
      passportNumber: "SECRET123",
      emergencyContact: "Mum",
      medicalNotes: "Very private",
    });

    const dashboard = await groupDashboard(me, booking.reference);
    expect(dashboard.summary).toMatchObject({ total: 1, completed: 1, passports: 1, roomsPending: 1 });
    expect(dashboard.payment.perPersonCents).toBe(Math.round(1_000_000 / 3));
    const row = dashboard.travellers[0];
    expect(row?.fullName).toBe("Private Person");
    // Redacted: the row type carries no passport, medical or emergency fields.
    expect(row).not.toHaveProperty("passportNumber");
    expect(row).not.toHaveProperty("medicalNotes");
    expect(row).not.toHaveProperty("emergencyContact");
    expect(JSON.stringify(dashboard)).not.toContain("SECRET123");
    expect(JSON.stringify(dashboard)).not.toContain("Very private");
    await cleanup(me.id, booking.id);
  });

  it("tracks incomplete travellers honestly", async () => {
    const { booking, me } = await ownerWithBooking();
    await createGroup(me, booking.reference, { name: "Partial Group" });
    const [invite] = await inviteTravellers(me, booking.reference, { emails: ["half@example.com"] });
    if (!invite) throw new Error("invite missing");
    await acceptInvite(invite.token, { fullName: "Half Done", kind: "adult" });
    const dashboard = await groupDashboard(me, booking.reference);
    expect(dashboard.summary).toMatchObject({ total: 1, completed: 0, passports: 0, roomsPending: 1 });
    await cleanup(me.id, booking.id);
  });
});

describe("group modification", () => {
  it("adds staff travellers and removes leavers", async () => {
    const { booking, me } = await ownerWithBooking();
    await createGroup(me, booking.reference, { name: "Modify Group" });
    // Organiser adds directly (existing traveller flow).
    const direct = await addTraveller(me, booking.reference, { fullName: "Walk-in Guest", kind: "adult" });
    expect(direct.inviteId).toBeNull();
    let dashboard = await groupDashboard(me, booking.reference);
    expect(dashboard.summary.total).toBe(1);

    // Staff invites through the booking id path.
    const { staffGroupInvite } = await import("@/server/groups");
    const invites = await staffGroupInvite(admin, booking.id, ["staff-invite@example.com"]);
    expect(invites).toHaveLength(1);
    dashboard = await groupDashboard(me, booking.reference);
    expect(dashboard.invites).toHaveLength(1);

    // Leaver removed; invite revoked.
    await removeTraveller(me, direct.id);
    dashboard = await groupDashboard(me, booking.reference);
    expect(dashboard.summary.total).toBe(0);
    await revokeInvite(me, invites[0]?.id ?? "");
    dashboard = await groupDashboard(me, booking.reference);
    expect(dashboard.invites[0]?.status).toBe("REVOKED");
    await cleanup(me.id, booking.id);
  });

  it("locks groups once underway", async () => {
    const { booking, me } = await ownerWithBooking();
    for (const status of ["IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"] as const) {
      await setBookingStatus(admin, booking.id, status);
    }
    await expect(createGroup(me, booking.reference, { name: "Too late" })).rejects.toThrow(GroupError);
    await cleanup(me.id, booking.id);
  });
});

describe("group summary math", () => {
  it("aggregates completion states", () => {
    expect(
      groupSummary([
        { fullName: "Amina Yusuf", nationality: "K", passportNumber: "1", emergencyContact: "Mum", roomPreference: "Single" },
        { fullName: "Brian Otieno", nationality: null, passportNumber: null, emergencyContact: null, roomPreference: null },
      ]),
    ).toEqual({ total: 2, completed: 1, passports: 1, roomsPending: 1 });
  });
});
