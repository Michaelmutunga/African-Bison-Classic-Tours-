"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/states";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);
  return (
    <ErrorState
      title="Operations view failed"
      description="This section could not load. Check your connection and try again."
      onRetry={reset}
    />
  );
}
