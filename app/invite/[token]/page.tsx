import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InviteForm } from "@/components/groups/invite-form";
import { Container } from "@/components/ui/layout";
import { getInviteContext } from "@/server/groups";

export const metadata: Metadata = {
  title: "Join a group safari",
  description: "Complete your traveller details for a group safari.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let context;
  try {
    context = await getInviteContext(token);
  } catch {
    notFound();
  }

  return (
    <Container className="max-w-2xl py-12">
      <p className="type-label text-clay-deep">Group safari · {context.group.name}</p>
      <h1 className="type-h1 mt-2 text-balance">{context.booking.tourTitle}</h1>
      <p className="type-small mt-2 text-ink/70">
        {context.booking.travelStart
          ? `Departs ${new Date(context.booking.travelStart).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · `
          : ""}
        This link is personal to {context.invite.email ?? "you"} — only your details,
        nobody else’s.
      </p>
      <div className="mt-6">
        <InviteForm token={token} initial={context.traveller} />
      </div>
    </Container>
  );
}
