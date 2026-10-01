"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CurrencyToggle } from "@/components/finance/currency-toggle";
import { Drawer } from "@/components/ui/drawer";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

export type AdminNavGroup = {
  title: string;
  links: { href: string; label: string }[];
};

export function AdminShell({
  userName,
  userRole,
  groups,
  rateBadge,
  displayCurrency,
  children,
}: {
  userName: string;
  userRole: string;
  groups: AdminNavGroup[];
  rateBadge: string | null;
  displayCurrency: "USD" | "KES";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <div className="grid gap-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="type-label text-ink/50">{group.title}</p>
          <ul className="mt-2 grid gap-1">
            {group.links.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "type-small flex items-center justify-between rounded-[2px] border px-3 py-2 transition-colors",
                      active
                        ? "border-ink bg-ink text-ivory"
                        : "border-transparent text-ink/80 hover:border-ink/20 hover:text-ink",
                    )}
                  >
                    {link.label}
                    {active ? (
                      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-ivory" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <Container className="py-8">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to operations content
      </a>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <p className="type-label text-clay-deep">Operations console</p>
          <h1 className="type-h2 mt-1">African Bison operations</h1>
          <p className="type-small mt-1 text-ink/60">
            Signed in as {userName} ({userRole})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {rateBadge ? (
            <Link
              href="/admin/settings#rates"
              className="type-caption rounded-full border border-ink/20 px-3 py-1.5 text-ink/70 hover:border-ink hover:text-ink"
              title="Manage currency rates"
            >
              {rateBadge}
            </Link>
          ) : null}
          <CurrencyToggle value={displayCurrency} />
          <button
            type="button"
            onClick={signOut}
            className="type-small cursor-pointer underline underline-offset-4 text-ink/70"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="admin-nav-drawer"
            className="type-small rounded-[2px] border border-ink/25 px-3 py-2 lg:hidden"
          >
            Menu
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Operations" className="hidden lg:block">
          <div className="sticky top-6">{nav}</div>
        </nav>
        <div id="admin-main">{children}</div>
      </div>

      <div id="admin-nav-drawer">
        <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="admin-menu-title" title="Operations menu" side="left">
          <nav aria-label="Operations mobile">{nav}</nav>
        </Drawer>
      </div>
    </Container>
  );
}
