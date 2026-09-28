/**
 * Branded email templates (Phase 12). Table-based HTML for mail clients,
 * plain-text twin for every message. All values are caller-supplied facts —
 * templates never invent prices, dates or guarantees.
 */

export interface TemplateInput {
  name?: string;
  reference?: string;
  title?: string;
  amount?: string;
  balance?: string;
  date?: string;
  details?: string[];
  ctaUrl?: string;
  ctaLabel?: string;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, greeting: string, paragraphs: string[], cta?: { url: string; label: string }): { html: string; text: string } {
  const safe = paragraphs.map(escapeHtml);
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#faf7f1;font-family:Georgia,serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf7f1;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e4d9c4;max-width:600px;width:100%;">
<tr><td style="background-color:#14120f;padding:20px 28px;">
<p style="margin:0;color:#e4d9c4;font-size:12px;letter-spacing:3px;">AFRICAN BISON CLASSIC TOURS</p>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:24px;color:#14120f;">${escapeHtml(title)}</h1>
<p style="margin:0 0 12px;font-size:16px;color:#14120f;">${escapeHtml(greeting)}</p>
${safe.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#2a2620;">${p}</p>`).join("")}
${cta ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background-color:#b4552d;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:14px;">${escapeHtml(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e4d9c4;">
<p style="margin:0;font-size:12px;color:#6b6455;">African Bison Classic Tours · Nairobi, Kenya · +254 734 466 432</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  const text = [`African Bison Classic Tours`, ``, title, ``, greeting, ``, ...paragraphs, ``]
    .join("\n") + (cta ? `\n${cta.label}: ${cta.url}\n` : "");
  return { html, text };
}

function greetingFor(input: TemplateInput): string {
  return input.name ? `Dear ${input.name},` : "Hello,";
}

export const templates = {
  inquiryReceived(input: TemplateInput): RenderedTemplate {
    const subject = `We received your enquiry${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Thank you — we’re on it", greetingFor(input), [
      "A safari planner will reply by email, usually within one business day.",
      ...(input.reference ? [`Your enquiry reference is ${input.reference}.`] : []),
    ]);
    return { subject, html, text };
  },

  quoteSent(input: TemplateInput): RenderedTemplate {
    const subject = `Your safari quote${input.reference ? ` ${input.reference}` : ""}`;
    const { html, text } = layout("Your quote is ready", greetingFor(input), [
      ...(input.title ? [`${input.title}.`] : []),
      ...(input.amount ? [`Total: ${input.amount}.`] : []),
      "Quotes are valid for 14 days unless stated otherwise. Reply to accept or adjust.",
    ], input.ctaUrl ? { url: input.ctaUrl, label: input.ctaLabel ?? "View quote" } : undefined);
    return { subject, html, text };
  },

  bookingConfirmed(input: TemplateInput): RenderedTemplate {
    const subject = `Your journey is reserved${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Your journey is reserved", greetingFor(input), [
      ...(input.title ? [`${input.title}.`] : []),
      ...(input.date ? [`Travel dates: ${input.date}.`] : []),
      "Next step: complete traveller information in your safari portal.",
    ], input.ctaUrl ? { url: input.ctaUrl, label: input.ctaLabel ?? "View my safari" } : undefined);
    return { subject, html, text };
  },

  paymentReceived(input: TemplateInput): RenderedTemplate {
    const subject = `Payment received${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Payment received — thank you", greetingFor(input), [
      ...(input.amount ? [`Amount: ${input.amount}.`] : []),
      ...(input.balance ? [`Outstanding balance: ${input.balance}.`] : []),
      "A receipt is available in your safari portal.",
    ]);
    return { subject, html, text };
  },

  balanceReminder(input: TemplateInput): RenderedTemplate {
    const subject = `Balance reminder${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("A gentle reminder", greetingFor(input), [
      ...(input.balance ? [`Your outstanding balance is ${input.balance}.`] : []),
      ...(input.date ? [`Please settle it by ${input.date} so final confirmations can go out.`] : []),
    ]);
    return { subject, html, text };
  },

  preTripChecklist(input: TemplateInput): RenderedTemplate {
    const subject = `Almost time — your pre-trip checklist${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Final preparations", greetingFor(input), [
      ...(input.details ?? []),
      "Open your safari portal to tick off each item.",
    ], input.ctaUrl ? { url: input.ctaUrl, label: input.ctaLabel ?? "Open checklist" } : undefined);
    return { subject, html, text };
  },

  tripItinerary(input: TemplateInput): RenderedTemplate {
    const subject = `Your trip itinerary${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Your day-by-day plan", greetingFor(input), [
      ...(input.details ?? ["Your confirmed itinerary is attached in your portal."]),
    ], input.ctaUrl ? { url: input.ctaUrl, label: input.ctaLabel ?? "View itinerary" } : undefined);
    return { subject, html, text };
  },

  tripReminder(input: TemplateInput): RenderedTemplate {
    const subject = `Your safari starts soon${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("The countdown is on", greetingFor(input), [
      ...(input.date ? [`Wheels up ${input.date}.`] : []),
      "Double-check passports, visas and insurance, and pack for early-morning game drives.",
    ]);
    return { subject, html, text };
  },

  bookingCancelled(input: TemplateInput): RenderedTemplate {
    const subject = `Booking cancelled${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Booking cancelled", greetingFor(input), [
      "Your booking has been cancelled as requested.",
      ...(input.details ?? []),
      "If money was paid, our team processes refunds manually and confirms by email.",
    ]);
    return { subject, html, text };
  },

  refundIssued(input: TemplateInput): RenderedTemplate {
    const subject = `Refund issued${input.reference ? ` (${input.reference})` : ""}`;
    const { html, text } = layout("Refund on its way", greetingFor(input), [
      ...(input.amount ? [`Amount: ${input.amount}.`] : []),
      "Refunds reach the original payment method within 5–10 business days depending on your bank.",
    ]);
    return { subject, html, text };
  },
};

export type TemplateName = keyof typeof templates;

export { SITE_URL };
