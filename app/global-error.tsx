"use client";

import { useEffect } from "react";

/**
 * Production error boundary (Phase 14). Customers get a calm recovery page;
 * technical detail goes to server logs only — never to the browser.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled render error", error.message);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <p className="type-label text-clay-deep">African Bison Classic Tours</p>
          <h1 className="type-h1 mt-2">Something went wrong</h1>
          <p className="type-small mt-3 text-ink/70">
            Please try again. If the problem persists, contact us and mention what you were doing —
            your journey details are safe.
          </p>
          <button
            type="button"
            onClick={reset}
            className="type-small mt-6 border border-ink/20 px-5 py-2.5 hover:border-ink"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
