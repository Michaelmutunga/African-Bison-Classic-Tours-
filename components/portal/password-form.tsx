"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";

export function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setDone(false);
    setSending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(form.get("currentPassword") ?? ""),
          newPassword: String(form.get("newPassword") ?? ""),
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, string[]>;
      };
      if (!response.ok || !body.ok) {
        if (body.details) setFieldErrors(body.details);
        setError(body.message ?? "Could not change password.");
        setSending(false);
        return;
      }
      setDone(true);
      (event.target as HTMLFormElement).reset();
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      ref={(node) => {
        node?.setAttribute("data-ready", "true");
      }}
      onSubmit={onSubmit}
      aria-label="Change password"
      className="max-w-md"
    >
      {error ? (
        <div className="mb-3">
          <ErrorState title="Password not changed" description={error} />
        </div>
      ) : null}
      {done ? (
        <p role="status" className="type-small mb-3 rounded-[2px] bg-earth/10 px-3 py-2">
          Password changed.
        </p>
      ) : null}
      <div className="grid gap-3">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <Label htmlFor="new-password">New password (12+ characters)</Label>
          <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
          {fieldErrors["newPassword"]?.[0] ? <FieldError>{fieldErrors["newPassword"][0]}</FieldError> : null}
        </div>
      </div>
      <Button type="submit" className="mt-3" disabled={sending}>
        {sending ? <Spinner label="Changing" /> : "Change password"}
      </Button>
    </form>
  );
}
