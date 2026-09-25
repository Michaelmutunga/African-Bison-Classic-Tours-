import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/auth";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Staff sign in for African Bison Classic Tours operations.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await currentUser();
  const { next } = await searchParams;
  if (user) redirect(next?.startsWith("/") ? next : "/admin/tours");

  return (
    <Container className="max-w-md py-16">
      <p className="type-label text-clay-deep">Staff only</p>
      <h1 className="type-h1 mt-2">Sign in</h1>
      <p className="type-small mt-2 text-ink/70">
        Operations console access. Customer accounts arrive with the booking engine.
      </p>
      <div className="mt-6">
        <LoginForm next={next?.startsWith("/") ? next : "/admin/tours"} />
      </div>
    </Container>
  );
}
