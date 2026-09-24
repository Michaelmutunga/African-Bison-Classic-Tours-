import Link from "next/link";
import { Container } from "@/components/ui/layout";

const SAFARIS = [
  { href: "/tours", label: "Kenya safaris" },
  { href: "/tours", label: "Tanzania safaris" },
  { href: "/tours", label: "Kenya + Tanzania" },
  { href: "/destinations", label: "Destinations" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-ink text-ivory">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="type-label text-sand">African Bison</p>
          <p className="font-display mt-1 text-2xl font-semibold">Classic Tours</p>
          <p className="type-small mt-3 text-ivory/70">
            East African safaris, planned around you. Nairobi, Kenya.
          </p>
        </div>
        <nav aria-label="Safaris">
          <p className="type-label text-sand">Safaris</p>
          <ul className="type-small mt-3 space-y-2">
            {SAFARIS.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-ivory/80 hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="type-label text-sand">Company</p>
          <ul className="type-small mt-3 space-y-2">
            <li>
              <Link href="/blog" className="text-ivory/80 hover:text-ivory">
                Journal
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-ivory/80 hover:text-ivory">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="type-label text-sand">Contact</p>
          <address className="type-small mt-3 space-y-1 not-italic text-ivory/80">
            <p>JKIA Airport, 1st Floor, Suite 1</p>
            <p>Nairobi, Kenya</p>
            <p>
              <a href="tel:+254734466432" className="underline underline-offset-4">
                +254 734 466 432
              </a>
            </p>
            <p>
              <a
                href="mailto:info@africanbisonclassictours.com"
                className="underline underline-offset-4"
              >
                info@africanbisonclassictours.com
              </a>
            </p>
          </address>
        </div>
      </Container>
      <div className="border-t border-ivory/15">
        <Container className="type-caption flex flex-col gap-1 py-5 text-ivory/60 sm:flex-row sm:justify-between">
          <p>© 2026 African Bison Classic Tours. All rights reserved.</p>
          <p>Contact details are configurable and will move to site settings.</p>
        </Container>
      </div>
    </footer>
  );
}
