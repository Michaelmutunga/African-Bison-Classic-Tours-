"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, string[]>;
      };
      if (!response.ok || !body.ok) {
        if (body.details) setFieldErrors(body.details);
        setError(body.message ?? "Could not create your account.");
        setSending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
      setSending(false);
    }
  }

  const errorFor = (name: string) => fieldErrors[name]?.[0];

  return (
    <form
      ref={(node) => {
        node?.setAttribute("data-ready", "true");
      }}
      onSubmit={onSubmit}
      aria-label="Create customer account"
    >
      {error ? (
        <div className="mb-4">
          <ErrorState title="Could not create account" description={error} />
        </div>
      ) : null}
      <div className="grid gap-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required />
          {errorFor("name") ? <FieldError>{errorFor("name")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {errorFor("email") ? <FieldError>{errorFor("email")}</FieldError> : null}
        </div>
        <div>
          <Label htmlFor="password">Password (12+ characters)</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          {errorFor("password") ? <FieldError>{errorFor("password")}</FieldError> : null}
        </div>
      </div>
      <div className="mt-5">
        <Button type="submit" size="lg" disabled={sending}>
          {sending ? <Spinner label="Creating account" /> : "Create account"}
        </Button>
      </div>
    </form>
  );
}
