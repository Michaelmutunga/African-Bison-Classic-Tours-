import { Prisma, type BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatMoney, SUPPORTED_CURRENCIES } from "@/lib/money";
import { notify } from "@/server/notifications/dispatch";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { NotFoundError, type Actor } from "@/server/catalogue";
import { hasPermission } from "@/lib/permissions";
import { applyTransition, type BookingTx } from "@/server/bookings";
import {
  ProviderTimeoutError,
  getProvider,
  type ProviderEvent,
  type ProviderName,
} from "@/server/payments/providers";

export class PaymentError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

/** Booking states that may receive money (post-quote workflow only). */
const PAYABLE: BookingStatus[] = ["AWAITING_PAYMENT", "PARTIALLY_PAID", "CONFIRMED", "IN_PROGRESS"];

function gateStaff(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

export const paymentInput = z.object({
  bookingId: z.string().cuid(),
  amountCents: z.number().int().min(1).max(100_000_000),
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  kind: z.enum(["DEPOSIT", "BALANCE", "FULL"]).default("DEPOSIT"),
  provider: z.string().trim().min(1).max(20).default("mock"),
  idempotencyKey: z.string().trim().max(120).optional(),
  // Guest path: the booking email proves ownership.
  email: z.string().trim().email().max(254).optional(),
});

async function audit(
  tx: BookingTx,
  actorId: string | null,
  action: string,
  resourceId: string,
): Promise<void> {
  await tx.auditLog.create({
    data: { actor: actorId ?? "guest", action, resource: "payment", resourceId },
  });
}

async function autoConfirm(
  tx: BookingTx,
  bookingId: string,
  actorId: string | null,
): Promise<void> {
  const booking = await tx.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.totalCents > 0 && booking.paidCents >= booking.totalCents) {
    // Paid in full from any payable state lands CONFIRMED (with effects).
    if (booking.status === "AWAITING_PAYMENT" || booking.status === "PARTIALLY_PAID") {
      await applyTransition(tx, bookingId, "CONFIRMED", actorId, "Paid in full");
      await confirmSupplierEffects(tx, booking, actorId);
    }
    return;
  }
  if (
    booking.status === "AWAITING_PAYMENT" &&
    booking.depositCents > 0 &&
    booking.paidCents >= booking.depositCents
  ) {
    await applyTransition(tx, bookingId, "PARTIALLY_PAID", actorId, "Deposit paid in full");
  }
}

/**
 * Payment-confirmed effects: supplier HELD locks become CONFIRMED,
 * payouts schedule as DUE, suppliers hear the good news.
 */
async function confirmSupplierEffects(
  tx: BookingTx,
  booking: { id: string; reference: string },
  actorId: string | null,
): Promise<void> {
  const locks = await tx.supplierLock.findMany({
    where: { bookingRef: booking.reference, status: "HELD" },
    include: { rate: true, supplier: { select: { id: true, name: true, email: true } } },
  });
  for (const lock of locks) {
    await tx.supplierLock.update({ where: { id: lock.id }, data: { status: "CONFIRMED" } });
    await tx.auditLog.create({
      data: { actor: actorId ?? "system", action: "supplier-lock.confirmed", resource: "supplier-lock", resourceId: lock.id },
    });
    if (lock.rate) {
      await tx.supplierPayout.create({
        data: {
          supplierId: lock.supplierId,
          bookingRef: booking.reference,
          lockId: lock.id,
          amountCents: lock.rate.costCents * lock.quantity,
          currency: lock.rate.currency,
          status: "DUE",
        },
      });
    }
  }
  // Voucher for the client portal documents.
  await tx.document.create({
    data: {
      bookingId: booking.id,
      kind: "voucher",
      title: `Safari voucher ${booking.reference}`,
      body: `Confirmed safari ${booking.reference}. Present this reference at every pickup.`,
      createdById: actorId,
    },
  });
  const emailed = new Set<string>();
  for (const lock of locks) {
    const email = lock.supplier.email;
    if (!email || emailed.has(email)) continue;
    emailed.add(email);
    await notify({
      event: "supplier.confirmed",
      channels: ["EMAIL"],
      to: { email },
      bookingId: booking.id,
      subject: `Booking confirmed: ${booking.reference}`,
      body: `${lock.supplier.name}, booking ${booking.reference} is confirmed and paid. Service: ${lock.serviceName} × ${lock.quantity}. Thank you for holding these dates.`,
      dedupeKey: `supplier:${lock.supplierId}:${booking.id}:confirmed`,
    });
  }
}

export async function createPayment(actor: Actor | null, input: unknown) {
  const data = paymentInput.parse(input);
  const booking = await prisma.booking.findUnique({ where: { id: data.bookingId } });
  if (!booking) throw new NotFoundError("Booking");
  if (actor) {
    gateStaff(actor);
  } else {
    if (!data.email || booking.customerEmail !== data.email.toLowerCase()) {
      throw new ForbiddenError("bookings.write");
    }
  }
  if (!PAYABLE.includes(booking.status)) {
    throw new PaymentError(`Bookings in ${booking.status} cannot receive payments`);
  }
  if (data.currency !== booking.currency) {
    throw new PaymentError(`Payment currency must match the booking (${booking.currency})`);
  }
  const balance = booking.totalCents - booking.paidCents;
  if (data.amountCents > balance) {
    throw new PaymentError(`Amount exceeds the outstanding balance of ${balance}`);
  }

  if (data.idempotencyKey) {
    const existing = await prisma.payment.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { attempts: true },
    });
    if (existing) return existing;
  }

  const provider = getProvider(data.provider as ProviderName);

  // Row first (own transaction), provider call outside any transaction so a
  // provider timeout cannot roll back the PENDING payment and its attempt.
  // A concurrent same-key insert loses the race here and falls back below.
  let payment;
  try {
    payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: provider.name,
        amountCents: data.amountCents,
        currency: data.currency,
        kind: data.kind,
        status: "PENDING",
        idempotencyKey: data.idempotencyKey ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      data.idempotencyKey
    ) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: { attempts: true },
      });
      if (existing) return existing;
    }
    throw error;
  }
  await prisma.auditLog.create({
    data: { actor: actor?.id ?? "guest", action: "payment.created", resource: "payment", resourceId: payment.id },
  });
  try {
    const created = await provider.createPayment({
      amountCents: data.amountCents,
      currency: data.currency,
      reference: booking.reference,
      customerEmail: booking.customerEmail,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: created.providerRef },
    });
    await prisma.paymentAttempt.create({
      data: { paymentId: payment.id, status: "initiated", providerRef: created.providerRef },
    });
  } catch (error) {
    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: error instanceof ProviderTimeoutError ? "timeout" : "failed",
        detail: error instanceof Error ? error.message.slice(0, 500) : "provider error",
      },
    });
    throw error;
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { attempts: true } });
}

/** New provider attempt against the same payment (post-timeout retries). */
export async function retryPayment(actor: Actor | null, paymentId: string, ownerEmail?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });
  if (!payment) throw new NotFoundError("Payment");
  if (actor) {
    gateStaff(actor);
  } else if (!ownerEmail || payment.booking.customerEmail !== ownerEmail.toLowerCase()) {
    throw new ForbiddenError("bookings.write");
  }
  if (payment.status !== "PENDING") throw new PaymentError("Only pending payments can be retried");
  const provider = getProvider(payment.provider as ProviderName);

  try {
    const created = await provider.createPayment({
      amountCents: payment.amountCents,
      currency: payment.currency,
      reference: payment.booking.reference,
      customerEmail: payment.booking.customerEmail,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: created.providerRef },
    });
    await prisma.paymentAttempt.create({
      data: { paymentId: payment.id, status: "retried", providerRef: created.providerRef },
    });
  } catch (error) {
    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: error instanceof ProviderTimeoutError ? "timeout" : "failed",
        detail: error instanceof Error ? error.message.slice(0, 500) : "provider error",
      },
    });
    throw error;
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { attempts: true } });
}

async function applySucceeded(
  tx: BookingTx,
  paymentId: string,
  providerRef: string,
  actorId: string | null,
): Promise<{ applied: boolean; rejected?: string }> {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });
  if (!payment) throw new NotFoundError("Payment");
  if (payment.status === "SUCCEEDED") return { applied: false }; // duplicate delivery
  if (payment.status !== "PENDING") return { applied: false }; // terminal: leave alone
  if (!PAYABLE.includes(payment.booking.status)) {
    // Recorded (not thrown): throwing here would roll back the CANCELLED
    // marking along with it.
    await tx.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    await tx.paymentAttempt.create({
      data: { paymentId: payment.id, status: "rejected", providerRef, detail: `Booking is ${payment.booking.status}` },
    });
    return { applied: false, rejected: `Booking is ${payment.booking.status}` };
  }
  await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
  await tx.paymentAttempt.create({
    data: { paymentId: payment.id, status: "succeeded", providerRef },
  });
  await tx.booking.update({
    where: { id: payment.bookingId },
    data: { paidCents: { increment: payment.amountCents } },
  });
  await audit(tx, actorId, "payment.succeeded", payment.id);
  await autoConfirm(tx, payment.bookingId, actorId);
  return { applied: true };
}

/** Authoritative webhook application. Idempotent by provider ref + status. */
export async function applyWebhookEvent(
  providerName: string,
  event: ProviderEvent,
  actorId: string | null = null,
): Promise<{ applied: boolean; paymentId: string }> {
  getProvider(providerName as ProviderName); // validates the provider exists
  const payment = await prisma.payment.findUnique({ where: { providerRef: event.providerRef } });
  if (!payment) throw new NotFoundError("Payment");
  if (payment.provider !== providerName) {
    throw new PaymentError("Webhook provider does not match the payment");
  }

  if (event.type === "failed") {
    return prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!fresh || fresh.status !== "PENDING") return { applied: false, paymentId: payment.id };
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      await tx.paymentAttempt.create({
        data: { paymentId: payment.id, status: "failed", providerRef: event.providerRef },
      });
      await audit(tx, actorId, "payment.failed", payment.id);
      return { applied: true, paymentId: payment.id };
    });
  }

  const outcome = await prisma.$transaction(async (tx) => {
    return applySucceeded(tx, payment.id, event.providerRef, actorId);
  });
  if (outcome.rejected) throw new PaymentError(`Payment cannot be applied: ${outcome.rejected}`);
  if (outcome.applied) {
    const fresh = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { booking: true },
    });
    const balance = Math.max(0, fresh.booking.totalCents - fresh.booking.paidCents);
    await notify({
      event: "payment.received",
      channels: ["EMAIL", "IN_APP"],
      to: { email: fresh.booking.customerEmail, userId: fresh.booking.userId ?? undefined },
      bookingId: fresh.bookingId,
      template: {
        name: "paymentReceived",
        input: {
          name: fresh.booking.customerName,
          reference: fresh.booking.reference,
          amount: formatMoney(fresh.amountCents, fresh.currency),
          balance: formatMoney(balance, fresh.currency),
        },
      },
      dedupeKey: `payment:${fresh.id}:received`,
    });
  }
  return { applied: outcome.applied, paymentId: payment.id };
}

/** Reconcile a pending payment against the provider (post-timeout recovery). */
export async function reconcilePayment(actor: Actor | null, paymentId: string, ownerEmail?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: true },
  });
  if (!payment) throw new NotFoundError("Payment");
  if (actor) {
    gateStaff(actor);
  } else if (!ownerEmail || payment.booking.customerEmail !== ownerEmail.toLowerCase()) {
    throw new ForbiddenError("bookings.write");
  }
  if (payment.status !== "PENDING" || !payment.providerRef) {
    return { status: payment.status, applied: false };
  }
  const provider = getProvider(payment.provider as ProviderName);
  const remote = await provider.getTransactionStatus(payment.providerRef);
  if (remote === "succeeded") {
    const outcome = await prisma.$transaction(async (tx) => {
      return applySucceeded(tx, payment.id, payment.providerRef as string, actor?.id ?? null);
    });
    if (outcome.rejected) return { status: "CANCELLED" as const, applied: false };
    return { status: "SUCCEEDED" as const, applied: outcome.applied };
  }
  if (remote === "failed") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "FAILED" as const, applied: true };
  }
  return { status: payment.status, applied: false };
}

export const refundInput = z.object({
  paymentId: z.string().cuid(),
  amountCents: z.number().int().min(1).optional(),
  reason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export async function refundPayment(actor: Actor | null, input: unknown) {
  gateStaff(actor);
  const data = refundInput.parse(input);

  if (data.idempotencyKey) {
    const existing = await prisma.refund.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
    if (existing) return existing;
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: data.paymentId },
      include: { refunds: true, booking: true },
    });
    if (!payment) throw new NotFoundError("Payment");
    if (payment.status !== "SUCCEEDED") throw new PaymentError("Only succeeded payments can be refunded");
    const refunded = payment.refunds
      .filter((r) => r.status === "SUCCEEDED")
      .reduce((sum, r) => sum + r.amountCents, 0);
    const remaining = payment.amountCents - refunded;
    const amount = data.amountCents ?? remaining;
    if (amount > remaining) {
      throw new PaymentError(`Refund exceeds the refundable ${remaining}`);
    }
    const provider = getProvider(payment.provider as ProviderName);
    const result = await provider.refundPayment(payment.providerRef ?? payment.id, amount);
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amountCents: amount,
        currency: payment.currency,
        status: "SUCCEEDED",
        providerRef: result.providerRef,
        reason: data.reason ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: amount >= remaining ? "REFUNDED" : payment.status },
    });
    await tx.booking.update({
      where: { id: payment.bookingId },
      data: { paidCents: { decrement: amount } },
    });
    await audit(tx, actor?.id ?? null, "payment.refunded", refund.id);
    return { refund, bookingEmail: payment.booking.customerEmail, bookingUserId: payment.booking.userId, bookingReference: payment.booking.reference, bookingName: payment.booking.customerName, bookingId: payment.bookingId, currency: payment.currency };
  });
  await notify({
    event: "refund.issued",
    channels: ["EMAIL", "IN_APP"],
    to: { email: outcome.bookingEmail, userId: outcome.bookingUserId ?? undefined },
    bookingId: outcome.bookingId,
    template: {
      name: "refundIssued",
      input: {
        name: outcome.bookingName,
        reference: outcome.bookingReference,
        amount: formatMoney(outcome.refund.amountCents, outcome.currency),
      },
    },
    dedupeKey: `refund:${outcome.refund.id}:issued`,
  });
  return outcome.refund;
}

export async function getPayment(actor: Actor | null, id: string, ownerEmail?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      booking: { select: { reference: true, customerEmail: true, totalCents: true, paidCents: true, currency: true, status: true } },
      attempts: { orderBy: { createdAt: "asc" } },
      refunds: true,
    },
  });
  if (!payment) throw new NotFoundError("Payment");
  if (actor) {
    gateStaff(actor);
  } else if (!ownerEmail || payment.booking.customerEmail !== ownerEmail.toLowerCase()) {
    throw new ForbiddenError("bookings.write");
  }
  return payment;
}

export async function listPayments(actor: Actor | null, bookingId?: string) {
  gateStaff(actor);
  return prisma.payment.findMany({
    where: bookingId ? { bookingId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { booking: { select: { reference: true } } },
  });
}

export async function receiptData(actor: Actor | null, id: string, ownerEmail?: string) {
  const payment = await getPayment(actor, id, ownerEmail);
  if (payment.status !== "SUCCEEDED") throw new PaymentError("Receipts exist only for succeeded payments");
  return {
    receiptFor: payment.id,
    bookingReference: payment.booking.reference,
    amountCents: payment.amountCents,
    currency: payment.currency,
    kind: payment.kind,
    provider: payment.provider,
    providerRef: payment.providerRef,
    bookingTotalCents: payment.booking.totalCents,
    bookingPaidCents: payment.booking.paidCents,
    issuedAt: new Date().toISOString(),
  };
}
