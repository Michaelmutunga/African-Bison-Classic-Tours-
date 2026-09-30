"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteBadge } from "@/components/site-badge";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";
import { SITE_CONTACT } from "@/lib/site-contact";

const NAV = [
  { href: "/tours", label: "Safaris" },
  { href: "/destinations", label: "Destinations" },
  { href: "/experiences", label: "Experiences" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** Marketing routes with an image hero: transparent header over the hero. */
const HERO_ROUTES = ["/", "/tours", "/destinations", "/experiences", "/blog"];

function isHeroRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return HERO_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close the menu on navigation (render-time adjustment, not an effect).
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const heroRoute = isHeroRoute(pathname);
  const transparent = heroRoute && !scrolled && !menuOpen;

  // Hydration sentinel for e2e: flips only after client hydration, so
  // specs never interact with pre-hydration markup on slow machines.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  useEffect(() => {
    // The descent hero is dark for several viewports, so the header
    // stays transparent with light text through it on the homepage.
    const onScroll = () => {
      const limit =
        pathname === "/" ? window.innerHeight * 3.8 : 24;
      setScrolled(window.scrollY > limit);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  // Native modal dialog: free Escape handling, focus trap and focus
  // return. Body scroll is locked while open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      document.body.style.overflow = "hidden";
    }
    if (!menuOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "inset-x-0 top-0 z-40 transition-colors duration-300",
          // Hero routes: overlay the hero, then turn solid on scroll.
          // App routes: normal in-flow bar, always solid.
          heroRoute ? "fixed" : "sticky",
          transparent
            ? "border-b border-transparent bg-transparent text-ivory"
            : "border-b border-ink/10 bg-ivory/95 text-ink backdrop-blur-none",
        )}
      >
        <div
          className={cn(
            "overflow-hidden bg-night text-ivory transition-all duration-300",
            scrolled ? "max-h-0 opacity-0" : "max-h-10 border-b border-ivory/10 opacity-100",
          )}
          aria-hidden={scrolled}
        >
          <Container className="flex items-center justify-between gap-4 py-1.5">
            <p className="type-caption">{SITE_CONTACT.placeLine}</p>
            <p className="type-caption hidden sm:block">
              <a href={SITE_CONTACT.phoneHref} className="underline underline-offset-4" tabIndex={scrolled ? -1 : undefined}>
                {SITE_CONTACT.phoneDisplay}
              </a>
            </p>
          </Container>
        </div>
        <Container className="flex items-center justify-between gap-4 py-4">
          <Link
            href="/"
            className="leading-none"
            aria-label="African Bison Classic Tours — home"
          >
            <SiteBadge />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "type-small transition-colors",
                  transparent ? "hover:text-sand" : "hover:text-clay-deep",
                  pathname === item.href
                    ? "font-semibold"
                    : transparent
                      ? "text-ivory/80"
                      : "text-ink/70",
                )}
              >
                {item.label}
              </Link>
            ))}
            <ButtonLink href="/builder" size="sm">
              Design your safari
            </ButtonLink>
          </nav>
          <button
            ref={triggerRef}
            type="button"
            className={cn(
              "type-label cursor-pointer border px-3.5 py-2 md:hidden",
              transparent ? "border-ivory/40 text-ivory" : "border-ink/25",
            )}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </Container>
      </header>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label="Menu"
        onClose={() => setMenuOpen(false)}
        className="m-0 h-full max-h-none w-full max-w-none border-0 bg-night p-0 text-ivory open:flex open:flex-col"
      >
        <Container className="flex items-center justify-between gap-4 py-4">
          <span className="leading-none" aria-hidden="true">
            <SiteBadge />
          </span>
          <button
            type="button"
            className="type-label cursor-pointer border border-ivory/40 px-3.5 py-2 text-ivory"
            onClick={() => {
              setMenuOpen(false);
              triggerRef.current?.focus();
            }}
          >
            Close
          </button>
        </Container>
        <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center">
          <Container className="flex flex-col">
            {[{ href: "/", label: "Home" }, ...NAV].map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                style={{ transitionDelay: `${index * 45}ms` }}
                className={cn(
                  "menu-link font-display border-b border-ivory/15 py-4 text-4xl tracking-tight last:border-0",
                  pathname === item.href ? "text-sand" : "text-ivory",
                )}
              >
                {item.label}
              </Link>
            ))}
          </Container>
        </nav>
        <Container className="flex flex-col gap-3 pb-10">
          <ButtonLink href="/builder" size="lg" variant="accent">
            Design your safari
          </ButtonLink>
          <p className="type-small text-center text-ivory/70">
            <a href={SITE_CONTACT.phoneHref} className="underline underline-offset-4">
              {SITE_CONTACT.phoneDisplay}
            </a>
          </p>
        </Container>
      </dialog>
    </>
  );
}
