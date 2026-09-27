import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { ConflictError, NotFoundError } from "@/server/catalogue";
import { testActor, unique } from "@/tests/db";
import {
  OperationsError,
  addInternalNote,
  listGuides,
  listVehicles,
  assignGuide,
  assignVehicle,
  calendarEvents,
  createGuide,
  unassignGuide,
  createTransfer,
  createVehicle,
  dashboardStats,
  deleteGuide,
  deleteVehicle,
  generateInvoice,
  listAuditLogs,
  setInvoiceStatus,
  unassignVehicle,
  updateTransfer,
} from "@/server/operations";

const admin = testActor("ADMIN");
const consultant = testActor("SAFARI_CONSULTANT");
const finance = testActor("FINANCE_USER");

async function staffBooking() {
  const booking = await createBooking(admin, {
    customerName: "Ops Guest",
    customerEmail: `${unique("ops")}@example.com`,
    travelStart: "2027-09-18T06:00:00Z",
    travelEnd: "2027-09-24T18:00:00Z",
    adults: 2,
    currency: "USD",
    subtotalCents: 500_000,
    totalCents: 500_000,
    depositCents: 150_000,
  });
  await setBookingStatus(admin, booking.id, "HOLD");
  return booking;
}

describe("RBAC", () => {
  it("rejects anonymous and read-only roles from operations", async () => {
    await expect(createVehicle(null, { registration: "X1", type: "Van", capacity: 6 })).rejects.toThrow(
      UnauthorizedError,
    );
    await expect(createVehicle(finance, { registration: "X1", type: "Van", capacity: 6 })).rejects.toThrow(
      ForbiddenError,
    );
    await expect(dashboardStats(null)).rejects.toThrow(UnauthorizedError);
    // Front-office roles operate reservations.
    const vehicle = await createVehicle(consultant, {
      registration: unique("KDJ"),
      type: "Van",
      capacity: 6,
    });
    expect(vehicle.registration).toMatch(/KDJ/);
    await deleteVehicle(admin, vehicle.id);
  });
});

describe("fleet", () => {
  it("creates vehicles and guides with unique registrations", async () => {
    const reg = unique("KDJ");
    const vehicle = await createVehicle(admin, { registration: reg, type: "4x4 Land Cruiser", capacity: 6 });
    expect(vehicle.registration).toBe(reg.toUpperCase());
    await expect(
      createVehicle(admin, { registration: reg.toLowerCase(), type: "Van", capacity: 6 }),
    ).rejects.toThrow(ConflictError);
    const guide = await createGuide(admin, { name: unique("Guide"), languages: ["English", "Swahili"] });
    expect(guide.languages).toEqual(["English", "Swahili"]);
    await deleteVehicle(admin, vehicle.id);
    await deleteGuide(admin, guide.id);
    await expect(deleteVehicle(admin, vehicle.id)).rejects.toThrow(NotFoundError);
  });
});

describe("assignments and conflicts", () => {
  it("assigns crew and fleet, rejecting overlaps", async () => {
    const booking = await staffBooking();
    const other = await staffBooking();
    const vehicle = await createVehicle(admin, { registration: unique("LC"), type: "4x4", capacity: 6 });
    const guide = await createGuide(admin, { name: unique("Guide") });
    const window = { bookingId: booking.id, startsAt: "2027-09-18T06:00:00Z", endsAt: "2027-09-24T18:00:00Z" };

    await assignVehicle(admin, vehicle.id, window);
    await assignGuide(admin, guide.id, window);
    await expect(
      assignVehicle(admin, vehicle.id, { ...window, bookingId: other.id }),
    ).rejects.toThrow(/already assigned/);
    await expect(
      assignGuide(admin, guide.id, { ...window, bookingId: other.id }),
    ).rejects.toThrow(/already assigned/);
    // Adjacent windows are fine.
    const adjacent = await assignVehicle(admin, vehicle.id, {
      bookingId: other.id,
      startsAt: "2027-09-24T18:00:00Z",
      endsAt: "2027-09-28T18:00:00Z",
    });
    expect(adjacent.id).toBeTruthy();

    await expect(deleteVehicle(admin, vehicle.id)).rejects.toThrow(ConflictError);
    await unassignVehicle(admin, adjacent.id);
    for (const assignment of await prisma.vehicleAssignment.findMany({ where: { vehicleId: vehicle.id } })) {
      await unassignVehicle(admin, assignment.id);
    }
    for (const assignment of await prisma.guideAssignment.findMany({ where: { guideId: guide.id } })) {
      await unassignGuide(admin, assignment.id);
    }
    await deleteVehicle(admin, vehicle.id);
    await deleteGuide(admin, guide.id);
    await prisma.booking.delete({ where: { id: booking.id } });
    await prisma.booking.delete({ where: { id: other.id } });
  });

  it("keeps fleet and guide lists staff-only", async () => {
    await expect(listVehicles(null)).rejects.toThrow(UnauthorizedError);
    await expect(listGuides(finance)).rejects.toThrow(ForbiddenError);
    expect((await listVehicles(admin)).length).toBeGreaterThanOrEqual(0);
  });

  it("serializes concurrent assignments to one winner", async () => {
    const bookings = await Promise.all([staffBooking(), staffBooking(), staffBooking()]);
    const vehicle = await createVehicle(admin, { registration: unique("RACE"), type: "4x4", capacity: 6 });
    const window = { startsAt: "2027-10-01T06:00:00Z", endsAt: "2027-10-05T18:00:00Z" };
    const attempts = await Promise.allSettled(
      bookings.map((b) => assignVehicle(admin, vehicle.id, { ...window, bookingId: b.id })),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((a) => a.status === "rejected")).toHaveLength(2);
    for (const assignment of await prisma.vehicleAssignment.findMany({ where: { vehicleId: vehicle.id } })) {
      await unassignVehicle(admin, assignment.id);
    }
    await deleteVehicle(admin, vehicle.id);
    for (const booking of bookings) {
      await prisma.booking.delete({ where: { id: booking.id } });
    }
  });

  it("rejects inactive resources and bad windows", async () => {
    const booking = await staffBooking();
    const vehicle = await createVehicle(admin, { registration: unique("OLD"), type: "Van", capacity: 6, status: "retired" });
    await expect(
      assignVehicle(admin, vehicle.id, { bookingId: booking.id, startsAt: "2027-09-18T06:00:00Z", endsAt: "2027-09-24T18:00:00Z" }),
    ).rejects.toThrow(/not active/);
    await expect(
      assignVehicle(admin, vehicle.id, { bookingId: booking.id, startsAt: "2027-09-24T18:00:00Z", endsAt: "2027-09-18T06:00:00Z" }),
    ).rejects.toThrow(/end after/);
    await deleteVehicle(admin, vehicle.id);
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("transfers and notes", () => {
  it("manages the transfer lifecycle", async () => {
    const booking = await staffBooking();
    const transfer = await createTransfer(admin, {
      bookingId: booking.id,
      pickup: "JKIA",
      dropoff: "Nairobi Hotel",
      scheduledAt: "2027-09-18T07:00:00Z",
      passengers: 2,
    });
    expect(transfer.status).toBe("scheduled");
    const moving = await updateTransfer(admin, transfer.id, { status: "in_progress" });
    expect(moving.status).toBe("in_progress");
    const done = await updateTransfer(admin, transfer.id, { status: "completed" });
    expect(done.status).toBe("completed");
    await expect(updateTransfer(admin, "ck00000000000000000000000", { status: "completed" })).rejects.toThrow(NotFoundError);
    await prisma.transfer.delete({ where: { id: transfer.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it("keeps internal notes staff-only", async () => {
    const booking = await staffBooking();
    const note = await addInternalNote(admin, booking.id, "VIP — window seat preferred.");
    expect(note.body).toContain("VIP");
    await expect(addInternalNote(null, booking.id, "x".repeat(10))).rejects.toThrow(UnauthorizedError);
    await expect(addInternalNote(admin, booking.id, "x")).rejects.toThrow(OperationsError);
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("invoices", () => {
  it("generates from booking totals and walks statuses", async () => {
    const booking = await staffBooking();
    const invoice = await generateInvoice(admin, booking.id);
    expect(invoice.number).toMatch(/^INV-\d{4}-/);
    expect(invoice.totalCents).toBe(500_000);
    expect(invoice.items).toHaveLength(1);
    await expect(setInvoiceStatus(admin, invoice.id, "PAID")).rejects.toThrow(/Cannot move/);
    await setInvoiceStatus(admin, invoice.id, "SENT");
    await setInvoiceStatus(admin, invoice.id, "PAID");
    const fresh = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(fresh.status).toBe("PAID");
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("calendar and dashboard", () => {
  it("emits events and surfaces seeded conflicts", async () => {
    const booking = await staffBooking();
    const vehicle = await createVehicle(admin, { registration: unique("CAL"), type: "4x4", capacity: 6 });
    // Bypass the guard to plant a genuine conflict for the detector.
    await prisma.vehicleAssignment.create({
      data: { vehicleId: vehicle.id, bookingId: booking.id, startsAt: new Date("2027-09-18T06:00:00Z"), endsAt: new Date("2027-09-20T18:00:00Z") },
    });
    await prisma.vehicleAssignment.create({
      data: { vehicleId: vehicle.id, bookingId: booking.id, startsAt: new Date("2027-09-19T06:00:00Z"), endsAt: new Date("2027-09-21T18:00:00Z") },
    });
    const { events, conflicts } = await calendarEvents(
      admin,
      new Date("2027-09-01T00:00:00Z"),
      new Date("2027-10-01T00:00:00Z"),
    );
    expect(events.some((e) => e.kind === "booking")).toBe(true);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts[0]?.resource).toContain("vehicle:");
    await prisma.vehicleAssignment.deleteMany({ where: { vehicleId: vehicle.id } });
    await deleteVehicle(admin, vehicle.id);
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it("reports real dashboard numbers", async () => {
    const stats = await dashboardStats(admin, new Date("2027-09-18T12:00:00Z"));
    expect(stats.arrivalsToday).toBeGreaterThanOrEqual(0);
    expect(stats.pipeline.length).toBeGreaterThan(0);
    expect(typeof stats.outstandingCents).toBe("number");
  });
});

describe("audit log", () => {
  it("records operations and lists them", async () => {
    const vehicle = await createVehicle(admin, { registration: unique("AUD"), type: "Van", capacity: 6 });
    const logs = await listAuditLogs(admin, { resource: "vehicle", take: 5 });
    expect(logs.some((l) => l.resourceId === vehicle.id && l.action === "vehicle.created")).toBe(true);
    await expect(listAuditLogs(null)).rejects.toThrow(UnauthorizedError);
    await deleteVehicle(admin, vehicle.id);
  });
});
