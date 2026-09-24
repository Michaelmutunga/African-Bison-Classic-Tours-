"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/tours", label: "Safaris" },
  { href: "/destinations", label: "Destinations" },
  { href: "/blog", label: "Journal" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur-none">
      <div className="border-b border-ink/10 bg-ink text-ivory">
        <Container className="flex items-center justify-between gap-4 py-1.5">
          <p className="type-caption">Nairobi, Kenya · Private & independent safari company</p>
          <p className="type-caption hidden sm:block">
            <a href="tel:+254734466432" className="underline underline-offset-4">
              +254 734 466 432
            </a>
          </p>
        </Container>
      </div>
      <Container className="flex items-center justify-between gap-4 py-4">
        <Link href="/" className="leading-none" aria-label="African Bison Classic Tours — home">
          <span className="type-label block">African Bison</span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Classic Tours
          </span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "type-small transition-colors hover:text-clay-deep",
                pathname === item.href ? "font-semibold text-ink" : "text-ink/70",
              )}
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/contact" size="sm">
            Design your safari
          </ButtonLink>
        </nav>
        <button
          type="button"
          className="type-label cursor-pointer border border-ink/25 px-3.5 py-2 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </Container>
      {menuOpen ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-ink/10 md:hidden">
          <Container className="flex flex-col py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "border-b border-ink/10 py-3 last:border-0",
                  pathname === item.href ? "font-semibold" : "text-ink/75",
                )}
              >
                {item.label}
              </Link>
            ))}
            <ButtonLink href="/contact" className="my-3">
              Design your safari
            </ButtonLink>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
