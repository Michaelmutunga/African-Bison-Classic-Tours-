import { z } from "zod";

export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  destination: z.string().trim().max(120).optional().or(z.literal("")),
  travelDates: z.string().trim().max(120).optional().or(z.literal("")),
  travellers: z.string().trim().max(40).optional().or(z.literal("")),
  tourSlug: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(5000),
  preferredContact: z.enum(["email", "phone", "whatsapp"]).optional(),
  // Structured origin payload (e.g. a safari-builder draft). Stored as-is.
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Honeypot: genuine users leave this empty.
  company: z.string().max(0).optional().or(z.literal("")),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

/** Non-sequential public reference, e.g. INQ-2026-4F8K2D. */
export function inquiryReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `INQ-${new Date().getFullYear()}-${suffix}`;
}
