"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { guestsApi, MAX_EXTRA, type GuestAdminAct, type GuestsView } from "@/lib/guests";
import { AdminButton, Card, field } from "./ui";

/**
 * Controls' Guests card (spec 32): upload the RSVP list, see who's here,
 * check people in, give extra raffle tickets, and remove guests.
 */
export function GuestsCard({ slug }: { slug: string }) {
  const id = useId();
  const [view, setView] = useState<GuestsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await guestsApi.list(slug, null);
    if (res.ok) setView((prev) => (prev?.upload ? { ...res.data, upload: prev.upload } : res.data));
  }, [slug]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  async function run(p: Promise<{ ok: true; data: GuestsView } | { ok: false; message: string }>) {
    setBusy(true);
    setError(null);
    const res = await p;
    setBusy(false);
    if (res.ok) {
      // The upload's result stays up until the next upload.
      const upload = res.data.upload;
      setView((prev) => {
        const kept = upload ?? prev?.upload;
        return kept ? { ...res.data, upload: kept } : res.data;
      });
    } else setError(res.message);
  }
  const admin = (body: GuestAdminAct) => run(guestsApi.admin(slug, body));

  const q = query.trim().toLowerCase();
  const shown = (view?.guests ?? []).filter(
    (g) => !q || g.name.toLowerCase().includes(q) || (g.family?.toLowerCase().includes(q) ?? false),
  );
  const missing = (view?.upload?.missing ?? []).filter((m) =>
    view?.guests.some((g) => g.id === m.id),
  );

  return (
    <Card
      title={view ? `Guests (${String(view.here)} of ${String(view.total)} here)` : "Guests"}
      actions={
        <Link href={`/${slug}/checkin`} className="text-sm font-bold text-gm-accent-ink">
          Check-in page
        </Link>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1">
          <label htmlFor={`${id}-csv`} className="text-sm font-bold">
            Upload the RSVP list (.csv: names, or family then name)
          </label>
          <input
            id={`${id}-csv`}
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void file.text().then((csv) => admin({ action: "upload", csv }));
            }}
            className="text-sm"
          />
        </div>
        {error && (
          <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
            {error}
          </p>
        )}
        {view?.upload && (
          <div role="status" className="grid gap-2 rounded-gm bg-gm-bg p-3 text-sm">
            <p className="m-0 font-bold">
              Added {view.upload.added}, already there {view.upload.kept}, not in this file{" "}
              {missing.length}.
            </p>
            {missing.length > 0 && (
              <ul aria-label="Not in this file" className="m-0 grid list-none gap-1 p-0">
                {missing.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {m.family ? `${m.family} · ` : ""}
                      {m.name}
                    </span>
                    <AdminButton
                      tone="danger"
                      disabled={busy}
                      onClick={() => void admin({ action: "remove", id: m.id })}
                    >
                      Remove
                    </AdminButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {view && view.total > 0 && (
          <>
            <p className="m-0 text-sm">
              In the raffle: {view.people} {view.people === 1 ? "person" : "people"}, {view.tickets}{" "}
              {view.tickets === 1 ? "ticket" : "tickets"}
            </p>
            <label className="grid gap-1">
              <span className="text-sm font-bold">Find a guest</span>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                className={field}
              />
            </label>
            <ul aria-label="Guest list" className="m-0 grid list-none gap-1 p-0">
              {shown.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center gap-2 border-b border-gm-border py-1.5"
                >
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={g.checkedIn}
                      disabled={busy}
                      onChange={() =>
                        void run(
                          guestsApi.act(slug, null, {
                            action: "checkIn",
                            ids: [g.id],
                            checkedIn: !g.checkedIn,
                          }),
                        )
                      }
                      className="size-5"
                    />
                    <span className="min-w-0 truncate">
                      {g.name}
                      {g.family && <span className="text-gm-text-muted"> · {g.family}</span>}
                    </span>
                  </label>
                  <span className="flex items-center gap-1" aria-label={`${g.name}'s tickets`}>
                    <AdminButton
                      tone="secondary"
                      disabled={busy || g.extra <= 0}
                      onClick={() =>
                        void admin({ action: "tickets", id: g.id, extra: g.extra - 1 })
                      }
                    >
                      <span aria-label="One ticket fewer">−</span>
                    </AdminButton>
                    <span className="min-w-[5.5rem] text-center text-sm tabular-nums">
                      {g.tickets} {g.tickets === 1 ? "ticket" : "tickets"}
                    </span>
                    <AdminButton
                      tone="secondary"
                      disabled={busy || g.extra >= MAX_EXTRA}
                      onClick={() =>
                        void admin({ action: "tickets", id: g.id, extra: g.extra + 1 })
                      }
                    >
                      <span aria-label="One more ticket">+</span>
                    </AdminButton>
                  </span>
                  {removing === g.id ? (
                    <span className="flex gap-1">
                      <AdminButton
                        tone="danger"
                        disabled={busy}
                        onClick={() => {
                          setRemoving(null);
                          void admin({ action: "remove", id: g.id });
                        }}
                      >
                        Yes, remove
                      </AdminButton>
                      <AdminButton
                        tone="secondary"
                        onClick={() => {
                          setRemoving(null);
                        }}
                      >
                        Cancel
                      </AdminButton>
                    </span>
                  ) : (
                    <AdminButton
                      tone="secondary"
                      disabled={busy}
                      onClick={() => {
                        setRemoving(g.id);
                      }}
                    >
                      Remove
                    </AdminButton>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {view?.total === 0 && (
          <p className="m-0 text-sm text-gm-text-muted">
            No guests yet. Upload the RSVP list, or add walk-ins on the check-in page.
          </p>
        )}
      </div>
    </Card>
  );
}
