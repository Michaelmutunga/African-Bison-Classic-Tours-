"use client";

import dynamic from "next/dynamic";

// Client boundary so `ssr: false` is legal: the widget JS (Dialog/chat)
// splits out of the initial bundle and never blocks page switches.
const ConciergeWidget = dynamic(
  () => import("@/components/concierge/concierge-widget").then((m) => m.ConciergeWidget),
  { ssr: false, loading: () => null },
);

export function ConciergeLazy() {
  return <ConciergeWidget />;
}
