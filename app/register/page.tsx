import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { currentUser } from "@/lib/auth";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an African Bison Classic Tours account to manage your safaris.",
};

export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "CUSTOMER" ? "/dashboard" : "/admin/tours");

  return (
    <Container className="max-w-md py-16">
      <p className="type-label text-clay-deep">Your safaris, in one place</p>
      <h1 className="type-h1 mt-2">Create account</h1>
      <p className="type-small mt-2 text-ink/70">
        Booked as a guest before? Use the same email — your safaris join your
        account automatically.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="type-small mt-4 text-ink/70">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </Container>
  );
}
