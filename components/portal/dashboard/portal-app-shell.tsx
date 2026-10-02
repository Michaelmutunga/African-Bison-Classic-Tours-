import { PortalSidebar } from "@/components/portal/dashboard/portal-sidebar";

/**
 * Three-column customer portal shell. One nav element restyles itself:
 * horizontal scroll row on phones, fixed sidebar from lg up. The rail
 * stacks below the main column until xl, where it docks to the right.
 * Keeps aria-label "Customer portal" for existing portal tests.
 */
export function PortalAppShell({
  children,
  rail,
}: {
  children: React.ReactNode;
  rail?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="grid items-start gap-5 lg:grid-cols-[14.5rem_minmax(0,1fr)] xl:grid-cols-[14.5rem_minmax(0,1fr)_18.5rem]">
        <nav
          aria-label="Customer portal"
          className="lg:sticky lg:top-6"
        >
          <PortalSidebar />
        </nav>
        <div className="min-w-0">{children}</div>
        {rail ? (
          <aside
            aria-label="Journey overview"
            className="grid content-start gap-4 lg:col-span-2 xl:col-span-1"
          >
            {rail}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
