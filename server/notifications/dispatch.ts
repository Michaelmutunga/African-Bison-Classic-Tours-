import type { NotificationChannel } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getEmailProvider, getSmsProvider, getWhatsAppProvider } from "@/server/notifications/providers";
import { templates, type TemplateInput, type TemplateName } from "@/server/notifications/templates";

/**
 * Notification dispatcher (Phase 12). Never throws: every channel failure
 * is recorded as a FAILED row so business flows (booking, payment) never
 * break because an email bounced.
 */

export interface NotifyArgs {
  event: string;
  channels: NotificationChannel[];
  to?: { email?: string; userId?: string; phone?: string };
  bookingId?: string;
  template?: { name: TemplateName; input: TemplateInput };
  subject?: string;
  body?: string;
  dedupeKey?: string;
}

export interface DispatchResult {
  id: string;
  channel: NotificationChannel;
  status: "SENT" | "FAILED" | "DUPLICATE";
}

function defaultDedupe(args: NotifyArgs, channel: NotificationChannel): string {
  if (args.dedupeKey) return `${args.dedupeKey}:${channel}`;
  const target = args.bookingId ?? args.to?.userId ?? args.to?.email ?? args.to?.phone ?? "broadcast";
  return `${args.event}:${channel}:${target}`;
}

function rendered(args: NotifyArgs): { subject: string; body: string; html: string } {
  if (args.template) {
    const template = templates[args.template.name];
    const renderedTemplate = template(args.template.input);
    return { subject: renderedTemplate.subject, body: renderedTemplate.text, html: renderedTemplate.html };
  }
  return { subject: args.subject ?? args.event, body: args.body ?? "", html: `<p>${args.body ?? ""}</p>` };
}

export async function notify(args: NotifyArgs): Promise<DispatchResult[]> {
  const { subject, body, html } = rendered(args);
  const results: DispatchResult[] = [];

  for (const channel of args.channels) {
    const key = defaultDedupe(args, channel);
    try {
      const existing = await prisma.notification.findUnique({ where: { dedupeKey: key } });
      if (existing) {
        results.push({ id: existing.id, channel, status: "DUPLICATE" });
        continue;
      }

      if (channel === "EMAIL") {
        if (!args.to?.email) {
          results.push({ id: "", channel, status: "FAILED" });
          continue;
        }
        const row = await prisma.notification.create({
          data: {
            event: args.event,
            channel,
            status: "QUEUED",
            toAddress: args.to.email,
            userId: args.to.userId ?? null,
            bookingId: args.bookingId ?? null,
            subject,
            body,
            dedupeKey: key,
          },
        });
        try {
          const { providerRef } = await getEmailProvider().send({
            to: args.to.email,
            subject,
            html,
            text: body,
          });
          await prisma.notification.update({
            where: { id: row.id },
            data: { status: "SENT", providerRef },
          });
          results.push({ id: row.id, channel, status: "SENT" });
        } catch (error) {
          await prisma.notification.update({
            where: { id: row.id },
            data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "send failed" },
          });
          results.push({ id: row.id, channel, status: "FAILED" });
        }
        continue;
      }

      if (channel === "IN_APP") {
        const row = await prisma.notification.create({
          data: {
            event: args.event,
            channel,
            status: "SENT",
            toAddress: args.to?.email ?? null,
            userId: args.to?.userId ?? null,
            bookingId: args.bookingId ?? null,
            subject,
            body,
            dedupeKey: key,
          },
        });
        results.push({ id: row.id, channel, status: "SENT" });
        continue;
      }

      // WHATSAPP / SMS: boundaries that fail closed until connected.
      const provider = channel === "WHATSAPP" ? getWhatsAppProvider() : getSmsProvider();
      const row = await prisma.notification.create({
        data: {
          event: args.event,
          channel,
          status: "QUEUED",
          toAddress: args.to?.phone ?? null,
          userId: args.to?.userId ?? null,
          bookingId: args.bookingId ?? null,
          subject,
          body,
          dedupeKey: key,
        },
      });
      try {
        if (!args.to?.phone) throw new Error("No phone number on file");
        const { providerRef } = await provider.send({ to: args.to.phone, body });
        await prisma.notification.update({
          where: { id: row.id },
          data: { status: "SENT", providerRef },
        });
        results.push({ id: row.id, channel, status: "SENT" });
      } catch (error) {
        await prisma.notification.update({
          where: { id: row.id },
          data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "send failed" },
        });
        results.push({ id: row.id, channel, status: "FAILED" });
      }
    } catch (error) {
      // P2002 dedupe race or any other failure: record and move on.
      const message = error instanceof Error ? error.message : "dispatch failed";
      if (message.includes("Unique constraint")) {
        const existing = await prisma.notification.findUnique({ where: { dedupeKey: key } });
        results.push({ id: existing?.id ?? "", channel, status: "DUPLICATE" });
      } else {
        results.push({ id: "", channel, status: "FAILED" });
      }
    }
  }
  return results;
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

/** Trip-start reminders for safaris beginning in ~7 days. Idempotent per booking+date. */
export async function sendTripReminders(now: Date = new Date()): Promise<number> {
  const from = new Date(now.getTime() + 6 * 86_400_000);
  const to = new Date(now.getTime() + 8 * 86_400_000);
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PRE_TRIP"] },
      travelStart: { gte: from, lt: to },
    },
    select: { id: true, reference: true, customerName: true, customerEmail: true, userId: true, travelStart: true },
  });
  let sent = 0;
  for (const booking of bookings) {
    const date = booking.travelStart?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const results = await notify({
      event: "trip.reminder",
      channels: ["EMAIL", "IN_APP"],
      to: { email: booking.customerEmail, userId: booking.userId ?? undefined },
      bookingId: booking.id,
      template: { name: "tripReminder", input: { name: booking.customerName, reference: booking.reference, date } },
      dedupeKey: `trip:${booking.id}:${booking.travelStart?.toISOString().slice(0, 10)}`,
    });
    if (results.some((r) => r.status === "SENT")) sent += 1;
  }
  return sent;
}

/** Balance reminders for stale awaiting-deposit bookings. Repeats weekly at most. */
export async function sendBalanceReminders(now: Date = new Date()): Promise<number> {
  const stale = new Date(now.getTime() - 3 * 86_400_000);
  const bookings = await prisma.booking.findMany({
    where: { status: "AWAITING_DEPOSIT", createdAt: { lt: stale } },
    select: { id: true, reference: true, customerName: true, customerEmail: true, userId: true, totalCents: true, paidCents: true, currency: true },
  });
  let sent = 0;
  for (const booking of bookings) {
    const balance = booking.totalCents - booking.paidCents;
    if (balance <= 0) continue;
    const results = await notify({
      event: "balance.reminder",
      channels: ["EMAIL", "IN_APP"],
      to: { email: booking.customerEmail, userId: booking.userId ?? undefined },
      bookingId: booking.id,
      template: {
        name: "balanceReminder",
        input: {
          name: booking.customerName,
          reference: booking.reference,
          balance: formatMoney(balance, booking.currency),
        },
      },
      dedupeKey: `balance:${booking.id}:${isoWeek(now)}`,
    });
    if (results.some((r) => r.status === "SENT")) sent += 1;
  }
  return sent;
}

/** Hold-expiring warnings for holds lapsing within ~24h. Idempotent per hold+expiry. */
export async function sendHoldExpiringReminders(now: Date = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 24 * 3_600_000);
  const holds = await prisma.hold.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: now, lt: soon } },
    select: { id: true, bookingId: true, resourceType: true, resourceId: true, expiresAt: true },
  });
  let sent = 0;
  for (const hold of holds) {
    const results = await notify({
      event: "hold.expiring",
      channels: ["IN_APP"],
      bookingId: hold.bookingId,
      subject: "Hold expiring soon",
      body: `${hold.resourceType}:${hold.resourceId} releases at ${hold.expiresAt.toLocaleString("en-GB")}. Confirm the booking before it lapses.`,
      dedupeKey: `hold:${hold.id}:expiring:${hold.expiresAt.toISOString().slice(0, 13)}`,
    });
    if (results.some((r) => r.status === "SENT")) sent += 1;
  }
  return sent;
}

export async function listMyNotifications(userId: string, bookingEmails: string[]) {
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ userId }, { customerEmail: { in: bookingEmails } }] },
    select: { id: true },
  });
  const ids = bookings.map((b) => b.id);
  return prisma.notification.findMany({
    where: {
      channel: "IN_APP",
      OR: [{ userId }, ...(ids.length > 0 ? [{ bookingId: { in: ids } }] : [])],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
