import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";
import { listFaqs } from "@/server/content-admin";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Booking, planning and travel questions answered by African Bison Classic Tours.",
};

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const faqs = await listFaqs(true);
  return (
    <MarketingShell
      eyebrow="FAQ"
      title="Questions, answered honestly"
      lede="If your question is not here, ask us directly — a person replies."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <div className="grid max-w-3xl gap-4">
        {faqs.map((faq) => (
          <Card key={faq.id}>
            <CardBody>
              <h2 className="type-h3">{faq.question}</h2>
              <p className="type-small mt-2 text-ink/75">{faq.answer}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </MarketingShell>
  );
}
