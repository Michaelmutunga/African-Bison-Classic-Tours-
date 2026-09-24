import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact African Bison Classic Tours in Nairobi, Kenya to start planning your safari.",
};

export default function ContactPage() {
  return (
    <MarketingShell
      eyebrow="Contact"
      title="Start the conversation"
      lede="The inquiry form that creates real tracked inquiries lands in Phase 2. For now, reach the team directly."
    >
      <Card>
        <CardBody>
          <address className="type-body not-italic">
            <p className="type-h3">African Bison Classic Tours</p>
            <p className="mt-2">JKIA Airport, 1st Floor, Suite 1, Nairobi, Kenya</p>
            <p className="mt-2">
              <a href="tel:+254734466432" className="underline underline-offset-4">
                +254 734 466 432
              </a>
              {" · "}
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
    </MarketingShell>
  );
}
