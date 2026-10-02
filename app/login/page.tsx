import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
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
  if (user) redirect(homeFor(user.role, next));

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
