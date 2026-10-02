"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandOrbit } from "@/components/brand-orbit";
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

/**
 * Marketing index routes with a full-bleed dark hero: transparent header
 * overlays the hero. Detail pages (e.g. /tours/[slug]) render on a light
 * background, so they always get the solid header — treating them as hero
 * routes left ivory text on ivory and looked like a missing nav.
 */
const HERO_ROUTES = ["/", "/tours", "/destinations", "/experiences", "/blog"];

export function isHeroRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return HERO_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname === route,
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    // The homepage hero is a single dark frame, so the header stays
    // transparent with light text through it until the hero scrolls off.
    const onScroll = () => {
      const limit =
        pathname === "/" ? window.innerHeight * 0.9 : 24;
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
      // The dialog brand is a link now, so initial focus is set
      // explicitly on Close instead of relying on tab order.
      closeRef.current?.focus();
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
            <p className="type-caption hidden items-center gap-4 sm:flex">
              <a href={SITE_CONTACT.phoneHref} className="underline underline-offset-4" tabIndex={scrolled ? -1 : undefined}>
                {SITE_CONTACT.phoneDisplay}
              </a>
              <span aria-hidden="true" className="inline-block h-3 w-px bg-ivory/25" />
              <Link href="/login" className="underline underline-offset-4" tabIndex={scrolled ? -1 : undefined}>
                My safari login
              </Link>
              <Link href="/staff/login" className="underline underline-offset-4" tabIndex={scrolled ? -1 : undefined}>
                Staff
              </Link>
            </p>
          </Container>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 pr-5 pl-5 sm:pr-8 sm:pl-8">
          <div className="flex shrink-0 items-center gap-3">
            <BrandOrbit tone={transparent ? "text-ivory" : "text-ink"} />
            <Link
              href="/"
              aria-label="African Bison Classic Tours — home"
              className="leading-none"
            >
              <span
                className={cn(
                  "type-label block tracking-[0.18em] uppercase",
                  transparent ? "text-ivory/75" : "text-ink/60",
                )}
              >
                African Bison
              </span>
              <span
                className={cn(
                  "font-display block text-[1.65rem] leading-tight font-semibold tracking-tight",
                  transparent ? "text-ivory" : "text-ink",
                )}
              >
                Classic Tours
              </span>
            </Link>
          </div>
          <nav aria-label="Primary" className="hidden items-center gap-5 lg:gap-7 md:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "type-small group relative py-1 transition-colors",
                    transparent ? "hover:text-sand" : "hover:text-clay-deep",
                    active
                      ? "font-semibold"
                      : transparent
                        ? "text-ivory/80"
                        : "text-ink/70",
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 h-px origin-left transition-transform duration-300",
                      transparent ? "bg-sand" : "bg-clay-deep",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                  {active ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -top-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                        transparent ? "bg-sand" : "bg-clay-deep",
                      )}
                    />
                  ) : null}
                </Link>
              );
            })}
            <span className="flex items-center gap-2">
              <Link
                href="/login"
                className={cn(
                  "type-label border px-3.5 py-2 transition-colors",
                  transparent
                    ? "border-ivory/40 text-ivory hover:border-sand hover:text-sand"
                    : "border-ink/25 text-ink hover:border-ink hover:bg-ink/5",
                )}
              >
                My safari
              </Link>
              <Link
                href="/staff/login"
                className={cn(
                  "type-label px-2 py-2 underline underline-offset-4 transition-colors",
                  transparent ? "text-ivory/75 hover:text-sand" : "text-ink/60 hover:text-ink",
                )}
              >
                Staff
              </Link>
              <ButtonLink href="/builder" size="sm" variant="accent">
                Design your safari
              </ButtonLink>
            </span>
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
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label="Menu"
        onClose={() => setMenuOpen(false)}
        className="m-0 h-full max-h-none w-full max-w-none border-0 bg-night p-0 text-ivory open:flex open:flex-col"
      >
        <Container className="flex items-center justify-between gap-4 py-2">
          <span className="leading-none" aria-hidden="true">
            <BrandOrbit tone="text-ivory" badgeClassName="h-20 w-20" logoSize={52} />
          </span>
          <button
            ref={closeRef}
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
          <div className="grid grid-cols-2 gap-3">
            <ButtonLink href="/login" size="lg" variant="secondary" className="border-ivory/40 text-ivory hover:border-ivory hover:bg-ivory/10">
              My safari login
            </ButtonLink>
            <ButtonLink href="/staff/login" size="lg" variant="secondary" className="border-ivory/40 text-ivory hover:border-ivory hover:bg-ivory/10">
              Staff login
            </ButtonLink>
          </div>
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
