import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Container, SectionHeading } from "@/components/ui/layout";

const JOURNEYS = [
  { title: "Kenya", detail: "Maasai Mara · Amboseli · Nakuru · Naivasha" },
  { title: "Tanzania", detail: "Serengeti · Ngorongoro · Tarangire · Manyara" },
  { title: "Kenya + Tanzania", detail: "The great cross-border migrations" },
  { title: "Mountains & Culture", detail: "Kilimanjaro · Mt Kenya · Maasai heritage" },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="bg-ink text-ivory">
        <Container className="py-16 sm:py-24">
          <p className="type-label text-sand">Your Africa. Your way.</p>
          <h1 className="type-display mt-4 max-w-4xl text-balance">
            East African safaris, designed around you.
          </h1>
          <p className="type-body mt-5 max-w-2xl text-ivory/75">
            Private Kenya and Tanzania journeys — Mara river crossings, Amboseli
            elephants beneath Kilimanjaro, the Serengeti plains. Planned with
            people who know the ground.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="accent" size="lg">
              Design your safari
            </ButtonLink>
            <ButtonLink
              href="/tours"
              size="lg"
              className="border border-ivory/30 text-ivory hover:border-ivory hover:bg-ivory/10"
            >
              Explore safaris
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Signature journeys"
          title="Four ways into East Africa"
          lede="The full catalogue, day-by-day itineraries and live pricing arrive in the next phases. This is the shape of it."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {JOURNEYS.map((journey) => (
            <Card key={journey.title}>
              <CardBody>
                <p className="type-h3">{journey.title}</p>
                <p className="type-small mt-1 text-ink/70">{journey.detail}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </Container>

      <section className="border-y border-ink/10 bg-parchment">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Why African Bison"
            title="An independent Nairobi company, not a marketplace"
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="sand">Private & tailor-made</Badge>
            <Badge tone="earth">Experienced driver-guides</Badge>
            <Badge tone="neutral">Trusted lodges & camps</Badge>
            <Badge tone="clay">Migration specialists</Badge>
          </div>
        </Container>
      </section>

      <Container className="py-14 text-center sm:py-20">
        <h2 className="type-h2 mx-auto max-w-2xl text-balance">
          Tell us the trip you are dreaming of. We will design it.
        </h2>
        <div className="mt-6">
          <ButtonLink href="/contact" variant="accent" size="lg">
            Start planning
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
