import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUser } from "@/lib/auth";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "My safari login",
  description: "Sign in to your African Bison Classic Tours safari portal.",
  robots: { index: false, follow: false },
};

function homeFor(role: string, next?: string): string {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    if (role === "CUSTOMER" && (next.startsWith("/safari") || next.startsWith("/dashboard") || next.startsWith("/my-safaris") || next.startsWith("/profile"))) {
      return next;
    }
    if (role !== "CUSTOMER" && next.startsWith("/admin")) return next;
  }
  return role === "CUSTOMER" ? "/dashboard" : "/admin/tours";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user && user.role === "CUSTOMER") redirect(homeFor(user.role, next));
  if (user) {
    // A staff session is active in this browser. Bouncing silently to
    // /admin would look like "every login goes to admin", so explain
    // and offer a way across instead.
    return (
      <Container className="max-w-md py-16">
        <p className="type-label text-clay-deep">My safari portal</p>
        <h1 className="type-h1 mt-2">You are signed in as staff</h1>
        <p className="type-small mt-2 text-ink/70">
          {user.name} ({user.email}) is signed in with a staff account, which lives in
          operations. To use the customer portal, sign out first and then sign in
          with a traveller account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SignOutButton landing="/login" />
          <Link
            href="/admin/tours"
            className="type-label inline-flex items-center justify-center gap-2 rounded-[2px] bg-ink px-5 py-2.5 text-ivory normal-case"
          >
            Continue to operations
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="max-w-md py-16">
      <p className="type-label text-clay-deep">My safari portal</p>
      <h1 className="type-h1 mt-2">Customer sign in</h1>
      <p className="type-small mt-2 text-ink/70">
        Travellers sign in here to view itineraries, payments and trip documents.
        African Bison staff should use the{" "}
        <Link href="/staff/login" className="underline underline-offset-4">
          staff login
        </Link>
        .
      </p>
      <div className="mt-6">
        <LoginForm next={next?.startsWith("/") ? next : "/dashboard"} portal="customer" />
      </div>
      <p className="type-small mt-4 text-ink/70">
        New here?{" "}
        <Link href="/register" className="underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </Container>
  );
}
