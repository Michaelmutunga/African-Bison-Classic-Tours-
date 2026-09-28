"use client";

import { useEffect, useState } from "react";

interface FeedItem {
  id: string;
  event: string;
  subject: string | null;
  body: string | null;
  createdAt: string;
}

export function NotificationFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/account/notifications");
        const body = (await response.json()) as { ok?: boolean; notifications?: FeedItem[] };
        if (!cancelled && response.ok && body.ok && body.notifications) {
          setItems(body.notifications.slice(0, 5));
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;
  return (
    <section aria-label="Notifications" className="mt-6">
      <h2 className="type-h3">Latest updates</h2>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-[2px] border border-ink/15 px-4 py-3">
            <p className="type-small font-semibold">{item.subject ?? item.event}</p>
            {item.body ? <p className="type-caption mt-0.5 text-ink/65">{item.body.slice(0, 160)}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
