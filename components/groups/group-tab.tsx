"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { ErrorState, Spinner } from "@/components/ui/states";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";

interface InviteRow {
  id: string;
  email: string | null;
  status: string;
  acceptedAt: string | null;
  token: string;
}

interface TravellerRow {
  id: string;
  fullName: string;
  kind: string;
  email: string | null;
  roomPreference: string | null;
  invitedEmail: string | null;
  completion: { details: boolean; passport: boolean; emergency: boolean; room: boolean; complete: boolean };
}

interface DashboardData {
  group: { id: string; name: string; expectedTravellers: number | null };
  booking: { reference: string; status: string; tourTitle: string | null };
  invites: InviteRow[];
  travellers: TravellerRow[];
  summary: { total: number; completed: number; passports: number; roomsPending: number };
  payment: { totalCents: number; paidCents: number; balanceCents: number; perPersonCents: number; currency: string };
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="type-caption inline-flex items-center gap-1">
      <span aria-hidden="true" className={done ? "text-earth" : "text-ink/35"}>
        {done ? "✓" : "○"}
      </span>
      {label}
    </span>
  );
}

export function GroupTab({ reference }: { reference: string }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [newLinks, setNewLinks] = useState<{ email: string | null; link: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/account/bookings/${reference}/group`);
      if (response.status === 404) {
        setData(null);
        return;
      }
      const body = (await response.json()) as { ok?: boolean; message?: string } & Partial<DashboardData>;
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Could not load the group.");
        return;
      }
      setData(body as DashboardData);
    } catch {
      setError("Network problem — check your connection and try again.");
    }
  }, [reference]);

  useEffect(() => {
    // Fetch-on-mount from the group API (external system). The set-state
    // calls happen after awaits; the rule cannot see that statically.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/account/bookings/${reference}/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() || "Group safari" }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        setError(body.message ?? "Could not create the group.");
        return;
      }
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    setNewLinks([]);
    try {
      const list = emails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
      const response = await fetch(`/api/account/bookings/${reference}/group/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: list }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, string[]>;
        invites?: { email: string | null; link: string }[];
      };
      if (!response.ok || !body.ok) {
        setError(body.details ? "Check the email addresses." : (body.message ?? "Could not invite."));
        return;
      }
      setNewLinks(body.invites ?? []);
      setEmails("");
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/account/invites/${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  if (error && !data) {
    return <ErrorState title="Group unavailable" description={error} />;
  }

  if (!data) {
    return (
      <div className="max-w-md">
        <h3 className="type-h3">Travel as a group?</h3>
        <p className="type-small mt-1 text-ink/70">
          Name the group, invite each traveller by email, and track who has
          completed their details — each person fills their own private form.
        </p>
        <div className="mt-3">
          <Label htmlFor={`group-name-${reference}`}>Group name</Label>
          <Input
            id={`group-name-${reference}`}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. The Mwangi family safari"
          />
        </div>
        <Button className="mt-3" disabled={busy} onClick={create}>
          {busy ? <Spinner label="Creating" /> : "Start group booking"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-4" aria-label="Group completion">
        {[
          { label: "Travellers", value: String(data.summary.total) },
          { label: "Complete", value: String(data.summary.completed) },
          { label: "Passports", value: String(data.summary.passports) },
          { label: "Rooms pending", value: String(data.summary.roomsPending) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[2px] border border-ink/15 px-4 py-3">
            <p className="type-label text-ink/60">{stat.label}</p>
            <p className="type-h3 type-numeric">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[2px] border border-ink/15 px-4 py-3">
        <p className="type-label text-ink/60">Group payment</p>
        <p className="type-small mt-1">
          Total {formatMoney(data.payment.totalCents, data.payment.currency)} · paid{" "}
          {formatMoney(data.payment.paidCents, data.payment.currency)} · balance{" "}
          {formatMoney(data.payment.balanceCents, data.payment.currency)}
        </p>
        <p className="type-caption mt-1 text-ink/60">
          ≈ {formatMoney(data.payment.perPersonCents, data.payment.currency)} per person
        </p>
      </div>

      <div>
        <h3 className="type-h3">Invite travellers</h3>
        <form onSubmit={invite} className="mt-2 max-w-xl" aria-label="Invite travellers">
          <Label htmlFor={`invite-emails-${reference}`}>Email addresses (one per line)</Label>
          <Textarea
            id={`invite-emails-${reference}`}
            rows={3}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder={"amina@example.com\nbrian@example.com"}
          />
          <Button type="submit" size="sm" className="mt-2" disabled={busy || !emails.trim()}>
            {busy ? <Spinner label="Inviting" /> : "Send invites"}
          </Button>
        </form>
        {newLinks.length > 0 ? (
          <div className="type-small mt-3 rounded-[2px] bg-earth/10 px-4 py-3" role="status">
            <p className="font-semibold">Share these links (email delivery arrives in Phase 12):</p>
            <ul className="mt-1 list-disc pl-5">
              {newLinks.map((invite) => (
                <li key={invite.link}>
                  {invite.email}: <span className="type-numeric">{invite.link}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.invites.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {data.invites.map((invite) => (
              <li
                key={invite.id}
                className="type-small flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[2px] border border-ink/15 px-3 py-2"
              >
                <span className="font-semibold">{invite.email ?? "No email"}</span>
                <span className="type-caption text-ink/60">{invite.status.toLowerCase()}</span>
                <span className="type-caption type-numeric text-ink/60">/invite/{invite.token.slice(0, 12)}…</span>
                {invite.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => revoke(invite.id)}
                    className="type-caption cursor-pointer underline underline-offset-4 text-clay-deep"
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <h3 className="type-h3">Travellers</h3>
        {data.travellers.length === 0 ? (
          <p className="type-small mt-2 text-ink/70">
            Nobody listed yet — invite travellers above or add them in the Travellers tab.
          </p>
        ) : (
          <div className="mt-2">
            <DataTable caption="Group travellers">
              <TableHead>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Complete</TableHeaderCell>
                <TableHeaderCell>Passport</TableHeaderCell>
                <TableHeaderCell>Room</TableHeaderCell>
              </TableHead>
              <TableBody>
                {data.travellers.map((traveller) => (
                  <tr key={traveller.id}>
                    <TableCell>
                      {traveller.fullName}
                      <span className="type-caption block text-ink/55">
                        {traveller.email ?? traveller.invitedEmail ?? traveller.kind}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Check done={traveller.completion.complete} label={traveller.completion.complete ? "Complete" : "Incomplete"} />
                    </TableCell>
                    <TableCell>
                      <Check done={traveller.completion.passport} label={traveller.completion.passport ? "On file" : "Pending"} />
                    </TableCell>
                    <TableCell>{traveller.roomPreference ?? <span className="text-ink/50">Pending</span>}</TableCell>
                  </tr>
                ))}
              </TableBody>
            </DataTable>
          </div>
        )}
        <p className="type-caption mt-2 text-ink/60">
          Passport numbers and medical notes stay operator-only — organisers see completion, not contents.
        </p>
      </div>
    </div>
  );
}
