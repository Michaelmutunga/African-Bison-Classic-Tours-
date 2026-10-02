import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Container } from "@/components/ui/layout";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Staff login",
  description: "African Bison Classic Tours operations console sign-in for staff.",
  robots: { index: false, follow: false },
};

function homeFor(role: string, next?: string): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    if (role !== "CUSTOMER" && next.startsWith("/admin")) return next;
    if (role === "CUSTOMER" && (next.startsWith("/dashboard") || next.startsWith("/my-safaris") || next.startsWith("/safari") || next.startsWith("/profile"))) {
      return next;
    }
  }
  return role === "CUSTOMER" ? "/dashboard" : "/admin/tours";
}

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user && user.role !== "CUSTOMER") redirect(homeFor(user.role, next));
  if (user) {
    // A traveller session is active in this browser. Explain instead of
    // silently bouncing to the customer portal.
    return (
      <Container className="max-w-md py-16">
        <p className="type-label text-clay-deep">Operations console</p>
        <h1 className="type-h1 mt-2">You are signed in as a traveller</h1>
        <p className="type-small mt-2 text-ink/70">
          {user.name} ({user.email}) is signed in with a traveller account, which lives
          in the safari portal. To use operations, sign out first and then sign in
          with a staff account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SignOutButton landing="/staff/login" />
          <Link
            href="/dashboard"
            className="type-label inline-flex items-center justify-center gap-2 rounded-[2px] bg-ink px-5 py-2.5 text-ivory normal-case"
          >
            Continue to my safari
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="max-w-md py-16">
      <p className="type-label text-clay-deep">Operations console</p>
      <h1 className="type-h1 mt-2">Staff sign in</h1>
      <p className="type-small mt-2 text-ink/70">
        Consultants, reservations, operations and finance sign in here. Travellers
        should use the{" "}
        <Link href="/login" className="underline underline-offset-4">
          customer login
        </Link>
        .
      </p>
      <div className="mt-6">
        <LoginForm next={next?.startsWith("/") ? next : "/admin/tours"} portal="staff" />
      </div>
    </Container>
  );
}
