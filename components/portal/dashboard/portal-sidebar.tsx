"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/my-safaris", label: "My safaris" },
  { href: "/profile", label: "Profile" },
] as const;

const SECTION_LINKS = [
  { href: "#calendar", label: "Dates" },
  { href: "#payments", label: "Payments" },
  { href: "#help", label: "Help" },
] as const;

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="portal-card p-3 lg:p-4">
      <div className="flex gap-1.5 overflow-x-auto lg:grid lg:overflow-visible">
        {LINKS.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "type-small shrink-0 rounded-[10px] px-4 py-2 font-medium",
                active ? "bg-ink text-ivory" : "text-ink/70 hover:bg-sand/50 hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <span className="hidden flex-1 lg:block" />
        <button
          type="button"
          onClick={signOut}
          className="type-small shrink-0 cursor-pointer rounded-[10px] px-4 py-2 text-ink/60 underline underline-offset-4 hover:text-ink lg:px-2 lg:text-left"
        >
          Sign out
        </button>
      </div>
      <div className="mt-2 hidden gap-1.5 border-t border-ink/10 pt-3 lg:grid">
        <p className="type-label px-2 text-ink/50">On this page</p>
        {SECTION_LINKS.map((link) => (
          <a
            key={link.href}
            href={`/dashboard${link.href}`}
            className="type-small rounded-[10px] px-2 py-1.5 text-ink/65 hover:bg-sand/50 hover:text-ink"
          >
            {link.label}
          </a>
        ))}
      </div>
      <div className="focus-ring-light mt-3 hidden rounded-[10px] bg-night px-4 py-4 text-ivory lg:block">
        <p className="type-label text-sand">Safari planner</p>
        <p className="type-small mt-1.5 text-ivory/85">
          Not sure what fits your dates yet. Tell us the shape of the trip.
        </p>
        <Link
          href="/request"
          className="type-small mt-3 inline-block rounded-[10px] bg-ivory px-4 py-2 font-semibold text-ink hover:bg-sand"
        >
          Talk to a planner
        </Link>
      </div>
    </div>
  );
}
