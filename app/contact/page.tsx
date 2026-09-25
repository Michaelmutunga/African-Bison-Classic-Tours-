import type { Metadata } from "next";
import { InquiryForm } from "@/components/inquiry-form";
import { publicTour } from "@/lib/catalog";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Enquire about Kenya and Tanzania safaris — African Bison Classic Tours, Nairobi. A planner replies, usually within one business day.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const { tour } = await searchParams;
  let tourTitle: string | undefined;
  if (tour) {
    try {
      tourTitle = (await publicTour(tour)).title;
    } catch {
      tourTitle = undefined;
    }
  }

  return (
    <MarketingShell
      eyebrow="Contact"
      title="Start the conversation"
      lede="Every enquiry creates a tracked request with its own reference — a person replies, usually within one business day."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardBody>
            <InquiryForm tourSlug={tour} tourTitle={tourTitle} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <address className="type-small not-italic">
              <p className="type-h3">African Bison Classic Tours</p>
              <p className="mt-2">JKIA Airport, 1st Floor, Suite 1, Nairobi, Kenya</p>
              <p className="mt-2">
                <a href="tel:+254734466432" className="underline underline-offset-4">
                  +254 734 466 432
                </a>
                <br />
                <a href="tel:+254111234567" className="underline underline-offset-4">
                  +254 111 234 567
                </a>
              </p>
              <p className="mt-1">
                <a
                  href="mailto:info@africanbisonclassictours.com"
                  className="underline underline-offset-4"
                >
                  info@africanbisonclassictours.com
                </a>
              </p>
            </address>
          </CardBody>
        </Card>
      </div>
    </MarketingShell>
  );
}
