import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MarketingShell } from "@/components/marketing-shell";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Booking, planning and travel questions answered by African Bison Classic Tours.",
};

const FAQS = [
  {
    q: "Where is African Bison Classic Tours based?",
    a: "We are an independent tour and travel company in Nairobi, Kenya — JKIA Airport, 1st Floor, Suite 1. You can reach us on +254 734 466 432 or info@africanbisonclassictours.com.",
  },
  {
    q: "Which countries do you operate in?",
    a: "Kenya and Tanzania are our core safari ground, including combined Kenya + Tanzania itineraries. We also arrange Uganda gorilla treks, Mount Kilimanjaro and Mount Kenya climbs, Zanzibar beach extensions and airport transfers in Kenya, Uganda and Tanzania.",
  },
  {
    q: "Are your safaris private or shared?",
    a: "Most itineraries are private and tailor-made for your party. Shared and group options, including corporate travel, can be arranged — tell us your dates and group size when you enquire.",
  },
  {
    q: "What is typically included in a safari price?",
    a: "Transport as per itinerary, accommodation, meals as stated, an English-speaking driver-guide, park and reserve entrance fees, scheduled activities and mineral water on safari. International flights, visas, drinks, tips and optional extras such as balloon flights are normally excluded. Exact inclusions are listed on every itinerary.",
  },
  {
    q: "Why do itineraries say 'or similar' for accommodation?",
    a: "Lodges and camps sell out, especially in migration season. When a named property is full we book one of similar standard — and your confirmation always states exactly where you are staying.",
  },
  {
    q: "Will I definitely see the Big Five or a river crossing?",
    a: "No honest operator can promise that. Wildlife is wild. We plan around seasons and animal movements to give you the best chances — typically excellent in the Mara and Serengeti — and we will never guarantee a sighting.",
  },
  {
    q: "How do I book?",
    a: "Send an enquiry through our contact page with your dates, travellers and interests. We respond with a tailored itinerary and quote, hold your places while you decide, and confirm on deposit.",
  },
  {
    q: "Do you arrange airport transfers?",
    a: "Yes — arrival and departure transfers in Kenya, Uganda and Tanzania, including complimentary departure transfers for our safari clients.",
  },
] as const;

export default function FaqPage() {
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
          mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />
      <div className="grid max-w-3xl gap-4">
        {FAQS.map((faq) => (
          <Card key={faq.q}>
            <CardBody>
              <h2 className="type-h3">{faq.q}</h2>
              <p className="type-small mt-2 text-ink/75">{faq.a}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </MarketingShell>
  );
}
