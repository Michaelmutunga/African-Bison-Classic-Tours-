"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { formatMoney, minorUnitsPerMajor } from "@/lib/money";

import { ErrorState, Spinner } from "@/components/ui/states";

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }
  return payload as Record<string, unknown>;
}

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run, setError };
}

export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-3">
      <ErrorState title="Action failed" description={message} />
    </div>
  );
}

export function StatusButtons({ bookingId, next }: { bookingId: string; next: string[] }) {
  const { error, busy, run } = useAction();
  if (next.length === 0) return <p className="type-caption text-ink/60">Terminal state — no transitions.</p>;
  return (
    <div>
      <ActionError message={error} />
      <div className="flex flex-wrap gap-2">
        {next.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === "CANCELLED" || status === "EXPIRED" ? "secondary" : "primary"}
            disabled={busy}
            onClick={() => run(() => api(`/api/admin/bookings/${bookingId}`, "PATCH", { status }))}
          >
            → {status.replaceAll("_", " ")}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AssignForm({
  bookingId,
  kind,
  options,
}: {
  bookingId: string;
  kind: "vehicle" | "guide";
  options: { id: string; label: string }[];
}) {
  const { error, busy, run } = useAction();
  const [resourceId, setResourceId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  return (
    <form
      aria-label={`Assign ${kind}`}
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!resourceId || !startsAt || !endsAt) return;
        void run(() =>
          api(`/api/admin/${kind === "vehicle" ? "vehicles" : "guides"}/${resourceId}/assign`, "POST", {
            bookingId,
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
          }),
        );
      }}
    >
      <ActionError message={error} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`assign-${kind}`}>{kind === "vehicle" ? "Vehicle" : "Guide"}</Label>
          <Select id={`assign-${kind}`} value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
            <option value="">Select…</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={`assign-from-${kind}`}>From</Label>
            <Input id={`assign-from-${kind}`} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor={`assign-to-${kind}`}>To</Label>
            <Input id={`assign-to-${kind}`} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </div>
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Spinner label="Assigning" /> : `Assign ${kind} (conflicts rejected)`}
      </Button>
    </form>
  );
}

export function UnassignButton({ assignmentId, kind }: { assignmentId: string; kind: "vehicle" | "guide" }) {
  const { error, busy, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => run(() => api(`/api/admin/assignments/${assignmentId}?kind=${kind}`, "DELETE"))}
      >
        Remove
      </Button>
    </span>
  );
}

export function TransferForm({ bookingId }: { bookingId: string }) {
  const { error, busy, run } = useAction();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [passengers, setPassengers] = useState("2");
  return (
    <form
      aria-label="Create transfer"
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void run(() =>
          api("/api/admin/transfers", "POST", {
            bookingId,
            pickup,
            dropoff,
            scheduledAt: new Date(scheduledAt).toISOString(),
            passengers: Number(passengers) || 1,
          }),
        );
      }}
    >
      <ActionError message={error} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="transfer-pickup">Pickup</Label>
          <Input id="transfer-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} required placeholder="JKIA Terminal 1A" />
        </div>
        <div>
          <Label htmlFor="transfer-dropoff">Drop-off</Label>
          <Input id="transfer-dropoff" value={dropoff} onChange={(e) => setDropoff(e.target.value)} required placeholder="Nairobi hotel" />
        </div>
        <div>
          <Label htmlFor="transfer-when">Scheduled at</Label>
          <Input id="transfer-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="transfer-pax">Passengers</Label>
          <Input id="transfer-pax" type="number" min={1} value={passengers} onChange={(e) => setPassengers(e.target.value)} required />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Spinner label="Creating" /> : "Create transfer"}
      </Button>
    </form>
  );
}

export function TransferStatus({ id, status }: { id: string; status: string }) {
  const { error, busy, run } = useAction();
  const next = { scheduled: "in_progress", in_progress: "completed" }[status];
  if (!next) return <span className="type-caption text-ink/60">{status}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api(`/api/admin/transfers/${id}`, "PATCH", { status: next }))}>
        Mark {next.replace("_", " ")}
      </Button>
    </span>
  );
}

export function NoteForm({ bookingId }: { bookingId: string }) {
  const { error, busy, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <form
      aria-label="Add internal note"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        void run(() =>
          api(`/api/admin/bookings/${bookingId}/notes`, "POST", { body: body.trim() }).then(() => setBody("")),
        );
      }}
    >
      <ActionError message={error} />
      <Label htmlFor={`note-${bookingId}`}>Internal note (staff only, never shown to customers)</Label>
      <Textarea id={`note-${bookingId}`} rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" size="sm" className="mt-2" disabled={busy || !body.trim()}>
        {busy ? <Spinner label="Saving" /> : "Add note"}
      </Button>
    </form>
  );
}

export function MessageReply({ bookingId }: { bookingId: string }) {
  const { error, busy, run } = useAction();
  const [body, setBody] = useState("");
  return (
    <form
      aria-label="Reply to customer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        void run(() =>
          api(`/api/admin/bookings/${bookingId}/messages`, "POST", { body: body.trim() }).then(() => setBody("")),
        );
      }}
    >
      <ActionError message={error} />
      <Label htmlFor={`reply-${bookingId}`}>Reply as African Bison team</Label>
      <Textarea id={`reply-${bookingId}`} rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" size="sm" className="mt-2" disabled={busy || !body.trim()}>
        {busy ? <Spinner label="Sending" /> : "Send reply"}
      </Button>
    </form>
  );
}

export function RefundButton({ paymentId, maxCents, currency }: { paymentId: string; maxCents: number; currency: string }) {
  const { error, busy, run } = useAction();
  const [amount, setAmount] = useState("");
  const factor = minorUnitsPerMajor(currency);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      <Input
        aria-label="Refund amount in major units"
        inputMode="decimal"
        placeholder={`max ${formatMoney(maxCents, currency)}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="!w-44"
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={busy || !amount}
        onClick={() =>
          run(() =>
            api(`/api/admin/payments/${paymentId}/refund`, "POST", {
              amountCents: Math.round(Number(amount) * factor),
            }),
          )
        }
      >
        Refund
      </Button>
    </span>
  );
}

export function InvoiceActions({ bookingId }: { bookingId: string }) {
  const { error, busy, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      <Button size="sm" disabled={busy} onClick={() => run(() => api("/api/admin/invoices", "POST", { bookingId }))}>
        Generate invoice
      </Button>
    </span>
  );
}

export function InvoiceStatusButton({ id, status }: { id: string; status: string }) {
  const { error, busy, run } = useAction();
  const next = { DRAFT: "SENT", SENT: "PAID" }[status];
  if (!next) return <span className="type-caption text-ink/60">{status}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="type-caption text-clay-deep">{error}</span> : null}
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api(`/api/admin/invoices/${id}`, "PATCH", { status: next }))}>
        Mark {next}
      </Button>
    </span>
  );
}

export function DocumentAttach({ bookingId }: { bookingId: string }) {
  const { error, busy, run } = useAction();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return (
    <form
      aria-label="Attach document"
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        void run(() =>
          api(`/api/admin/bookings/${bookingId}/documents`, "POST", {
            bookingId,
            kind: "upload",
            title: title.trim(),
            url: url.trim() || undefined,
          }).then(() => {
            setTitle("");
            setUrl("");
          }),
        );
      }}
    >
      <ActionError message={error} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`doc-title-${bookingId}`}>Title</Label>
          <Input id={`doc-title-${bookingId}`} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor={`doc-url-${bookingId}`}>File URL</Label>
          <Input id={`doc-url-${bookingId}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Spinner label="Attaching" /> : "Attach document"}
      </Button>
    </form>
  );
}
