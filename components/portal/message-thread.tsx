"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerMessage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";
import { cn } from "@/lib/cn";

export function MessageThread({
  reference,
  initial,
  closed,
}: {
  reference: string;
  initial: CustomerMessage[];
  closed: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setSending(true);
    try {
      const response = await fetch(`/api/account/bookings/${reference}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: CustomerMessage; messageText?: string };
      if (!response.ok || !result.ok || !result.message) {
        setError(result.messageText ?? "Could not send your message.");
        setSending(false);
        return;
      }
      setMessages((current) => [...current, result.message as CustomerMessage]);
      setBody("");
      router.refresh();
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {messages.length === 0 ? (
        <p className="type-small text-ink/70">
          No messages yet. Ask anything — dates, rooms, dietary needs, pickup times.
        </p>
      ) : (
        <ol className="grid gap-3" aria-label="Messages with your safari team">
          {messages.map((message) => {
            const staff = message.authorRole === "staff";
            return (
              <li
                key={message.id}
                className={cn(
                  "max-w-xl rounded-[2px] border px-4 py-3",
                  staff ? "border-earth/40 bg-earth/5" : "border-ink/15",
                )}
              >
                <p className="type-caption text-ink/60">
                  {staff ? "African Bison team" : "You"} ·{" "}
                  {new Date(message.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="type-small mt-1 whitespace-pre-wrap">{message.body}</p>
              </li>
            );
          })}
        </ol>
      )}
      {closed ? (
        <p className="type-caption mt-3 text-ink/60">This journey is closed to new messages.</p>
      ) : (
        <form
          ref={(node) => {
            node?.setAttribute("data-ready", "true");
          }}
          onSubmit={send}
          className="mt-4"
          aria-label="Send a message"
        >
          {error ? (
            <div className="mb-3">
              <ErrorState title="Message not sent" description={error} />
            </div>
          ) : null}
          <Label htmlFor={`msg-${reference}`}>Message your safari team</Label>
          <Textarea
            id={`msg-${reference}`}
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="e.g. What time is pickup on day 3?"
          />
          <Button type="submit" className="mt-2" disabled={sending || !body.trim()}>
            {sending ? <Spinner label="Sending" /> : "Send message"}
          </Button>
        </form>
      )}
    </div>
  );
}
