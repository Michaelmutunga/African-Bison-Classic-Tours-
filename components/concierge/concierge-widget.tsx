"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogHeader } from "@/components/ui/dialog";

interface Proposal {
  kind: string;
  topic?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  from: "you" | "concierge";
  text: string;
  proposal?: Proposal;
}

const QUICK_PROMPTS = [
  "Where can I go?",
  "Tell me about the migration",
  "What should I pack?",
  "How do I contact you?",
];

export function ConciergeWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "concierge",
      text: "Hello! I'm the African Bison safari concierge. Ask about destinations, safaris, packing — or sign in and ask about your own booking.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(message: string, confirm = false, proposal?: Proposal) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setMessages((previous) => [...previous, { from: "you", text: confirm ? "Yes, please." : trimmed }]);
    setInput("");
    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirm ? { message: trimmed, confirm, proposal } : { message: trimmed }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        reply?: string;
        message?: string;
        needsConfirmation?: boolean;
        proposal?: Proposal;
      };
      if (response.ok && body.ok && body.reply) {
        setMessages((previous) => [
          ...previous,
          {
            from: "concierge",
            text: body.reply ?? "",
            proposal: body.needsConfirmation ? body.proposal : undefined,
          },
        ]);
      } else {
        setMessages((previous) => [
          ...previous,
          { from: "concierge", text: body.message ?? "Something went wrong. Please try again." },
        ]);
      }
    } catch {
      setMessages((previous) => [
        ...previous,
        { from: "concierge", text: "You're offline — reconnect and I'll pick up where we left off." },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open safari concierge"
        className="fixed bottom-5 right-5 z-40 shadow-lg"
      >
        Ask us
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="concierge-title">
        <DialogHeader id="concierge-title" title="Safari concierge" onClose={() => setOpen(false)} />
        <DialogBody>
          <div ref={listRef} role="log" aria-live="polite" aria-label="Concierge conversation" className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index}>
                <p
                  className={
                    message.from === "you"
                      ? "type-small ml-8 bg-ink px-3 py-2 text-ivory"
                      : "type-small mr-8 whitespace-pre-line border border-ink/15 bg-parchment px-3 py-2"
                  }
                >
                  {message.text}
                </p>
                {message.proposal ? (
                  <div className="mr-8 mt-1 flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void send("Yes, confirm my request.", true, message.proposal)}
                    >
                      Yes, confirm
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => void send("No, cancel that request.")}>
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <p className="type-caption text-ink/60">Thinking…</p> : null}
          </div>
          {messages.length <= 1 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(prompt)}
                  className="type-caption rounded-full border border-ink/20 px-3 py-1.5 hover:border-ink disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="concierge-input" className="sr-only">
              Ask the safari concierge
            </label>
            <input
              id="concierge-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about safaris, packing, or your booking…"
              maxLength={2000}
              autoComplete="off"
              className="type-small min-w-0 flex-1 border border-ink/20 bg-ivory px-3 py-2 outline-none focus:border-ink"
            />
            <Button type="submit" size="sm" disabled={busy || input.trim().length === 0}>
              Send
            </Button>
          </form>
          <p className="type-caption mt-2 text-ink/60">
            Answers come from our catalogue and — when signed in — your own booking. Payments and refunds always go through a person.
          </p>
        </DialogBody>
      </Dialog>
    </>
  );
}
