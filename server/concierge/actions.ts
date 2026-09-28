/**
 * Concierge actions (Phase 13). Exactly one mutation exists: filing a
 * planner callback request as a tracked ContactInquiry. It runs ONLY after
 * the caller confirms the exact proposal (see engine confirmation
 * protocol). Financial actions have no implementation here by design —
 * asking for one is refused before it ever reaches this module.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { inquiryReference } from "@/lib/inquiries";
import type { SafeUser } from "@/lib/auth";
import { ConciergeError, CONFIRMABLE_ACTIONS, type ConfirmableAction } from "@/server/concierge/policy";

export const contactPlannerProposalSchema = z.object({
  kind: z.literal("contact_planner"),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  topic: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(2000),
});

export type ContactPlannerProposal = z.infer<typeof contactPlannerProposalSchema>;

export function isConfirmable(kind: string): kind is ConfirmableAction {
  return (CONFIRMABLE_ACTIONS as readonly string[]).includes(kind);
}

export async function executeConfirmedAction(
  user: SafeUser | null,
  proposal: unknown,
): Promise<{ reference: string }> {
  const parsed = contactPlannerProposalSchema.safeParse(proposal);
  if (!parsed.success || !isConfirmable(parsed.data.kind)) {
    throw new ConciergeError("That request can't be actioned. Please ask again in plain words.");
  }
  const data = parsed.data;
  const reference = inquiryReference();
  await prisma.contactInquiry.create({
    data: {
      reference,
      name: data.name,
      email: data.email.toLowerCase(),
      message: `[concierge] ${data.topic}: ${data.message}`,
      preferredContact: "email",
      metadata: {
        source: "concierge",
        requestedBy: user ? { id: user.id, email: user.email } : "anonymous",
      },
    },
  });
  return { reference };
}
