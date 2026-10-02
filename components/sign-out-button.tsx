"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Signs the current session out, then sends the visitor to `landing`
 * (a login page), so switching between the customer and staff portals
 * never strands anyone on a silent redirect loop.
 */
export function SignOutButton({ landing }: { landing: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function signOut() {
    setSending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout is idempotent server-side; still move on so a flaky
      // network never traps the visitor on the wrong portal.
    }
    router.push(landing);
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" size="md" disabled={sending} onClick={signOut}>
      {sending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
