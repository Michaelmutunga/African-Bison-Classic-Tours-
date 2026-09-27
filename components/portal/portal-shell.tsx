"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/my-safaris", label: "My safaris" },
  { href: "/profile", label: "Profile" },
] as const;

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <Container className="py-10">
      <nav aria-label="Customer portal" className="flex flex-wrap items-center gap-2 border-b border-ink/15 pb-4">
        {LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "type-small rounded-full border px-4 py-1.5",
                active ? "border-ink bg-ink text-ivory" : "border-ink/25 hover:border-ink",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <span className="flex-1" />
        <button
          type="button"
          onClick={signOut}
          className="type-small cursor-pointer underline underline-offset-4 text-ink/70"
        >
          Sign out
        </button>
      </nav>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
