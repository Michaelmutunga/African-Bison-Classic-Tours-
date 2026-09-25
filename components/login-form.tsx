"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";

export function LoginForm({ next }: { next: string }) {
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
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Sign in failed.");
        setSending(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
      setSending(false);
    }
  }

  return (
    <form ref={markReady} onSubmit={onSubmit} aria-label="Staff sign in">
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
