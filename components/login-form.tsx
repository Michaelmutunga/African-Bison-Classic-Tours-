"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";

export function LoginForm({ next, portal = "customer" }: { next: string; portal?: "customer" | "staff" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Hydration marker (ref, no extra render): the submit handler only exists
  // client-side, so pre-hydration clicks would natively reload the page.
  function markReady(node: HTMLFormElement | null) {
    node?.setAttribute("data-ready", "true");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        user?: { role?: string };
      };
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Sign in failed.");
        setSending(false);
        return;
      }
      // Staff land in operations; customers in their portal. Each
      // portal only honours its own destinations and falls back to its
      // home, so a customer link pasted into the staff portal (or vice
      // versa) cannot bounce across portals.
      const role = body.user?.role ?? "";
      const staff = role !== "CUSTOMER";
      const customerHome = ["/safari", "/dashboard", "/my-safaris", "/profile"].some((prefix) =>
        next.startsWith(prefix),
      )
        ? next
        : "/dashboard";
      const staffHome = next.startsWith("/admin") ? next : "/admin/tours";
      router.push(staff ? staffHome : customerHome);
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
      setSending(false);
    }
  }

  return (
    <form
      ref={markReady}
      onSubmit={onSubmit}
      aria-label={portal === "staff" ? "Staff sign in" : "Customer sign in"}
    >
      {error ? (
        <div className="mb-4">
          <ErrorState title="Could not sign in" description={error} />
        </div>
      ) : null}
      <div className="grid gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      </div>
      <div className="mt-5">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner label="Signing in" /> : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
