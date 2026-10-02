import Link from "next/link";
import { SiteBadge } from "@/components/site-badge";
import { Container } from "@/components/ui/layout";
import { SITE_CONTACT } from "@/lib/site-contact";

const SAFARIS = [
  { href: "/tours?category=kenya", label: "Kenya safaris" },
  { href: "/tours?category=tanzania", label: "Tanzania safaris" },
  { href: "/tours?category=kenya-tanzania", label: "Kenya + Tanzania" },
  { href: "/tours?category=nairobi-day", label: "Nairobi day experiences" },
  { href: "/destinations", label: "Destinations" },
  { href: "/experiences", label: "Day experiences" },
] as const;

const COMPANY = [
  { href: "/about", label: "About us" },
  { href: "/blog", label: "Journal" },
  { href: "/faq", label: "FAQ" },
  { href: "/travel-information", label: "Travel information" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
  { href: "/dashboard", label: "My safaris" },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-night text-ivory">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <SiteBadge />
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
            {COMPANY.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ivory/80 hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="type-label text-sand">Contact</p>
          <address className="type-small mt-3 space-y-1 not-italic text-ivory/80">
            {SITE_CONTACT.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              <a href={SITE_CONTACT.phoneHref} className="underline underline-offset-4">
                {SITE_CONTACT.phoneDisplay}
              </a>
            </p>
            <p>
              <a
                href={`mailto:${SITE_CONTACT.email}`}
                className="underline underline-offset-4"
              >
                {SITE_CONTACT.email}
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
