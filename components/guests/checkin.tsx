"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CheckIcon } from "@/components/icons/game";
import { useHydrated } from "@/components/motion";
import { useSlots } from "@/components/slots/registry";
import { Skeleton } from "@/components/ui/skeleton";
import { guestsApi, type CheckinAct, type GuestRow, type GuestsView } from "@/lib/guests";
import { cx } from "@/lib/ui";

/**
 * The door's check-in page (spec 32): opened with the event's join code (Khai,
 * 2026-11-25) or the admin session; find a family, check them all in, tick
 * people in and out, and add walk-ins.
 */

const CODE_KEY = "gm-checkin-code";
const POLL_MS = 5000;
const field =
  "min-h-11 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-lg text-gm-text";
const label = "text-sm font-bold text-gm-text-muted";

function storedCode(slug: string): string | null {
  try {
    return localStorage.getItem(`${CODE_KEY}:${slug}`);
  } catch {
    return null;
  }
}
function storeCode(slug: string, code: string | null) {
  try {
    if (code) localStorage.setItem(`${CODE_KEY}:${slug}`, code);
    else localStorage.removeItem(`${CODE_KEY}:${slug}`);
  } catch {
    // Private mode: the helper types the code again after a reload.
  }
}

/** A family together, or one guest on their own. */
type Group = { key: string; family: string | null; guests: GuestRow[] };

function groupsOf(guests: readonly GuestRow[]): Group[] {
  const groups: Group[] = [];
  const byFamily = new Map<string, Group>();
  for (const g of guests) {
    if (!g.family) {
      groups.push({ key: g.id, family: null, guests: [g] });
      continue;
    }
    const key = g.family.toLowerCase();
    let group = byFamily.get(key);
    if (!group) {
      group = { key: `f:${key}`, family: g.family, guests: [] };
      byFamily.set(key, group);
      groups.push(group);
    }
    group.guests.push(g);
  }
  return groups;
}

const matches = (g: GuestRow, q: string) =>
  g.name.toLowerCase().includes(q) || (g.family?.toLowerCase().includes(q) ?? false);

function CodeForm({ onCode, error }: { onCode: (code: string) => void; error: string | null }) {
  const { Button } = useSlots();
  const id = useId();
  const [code, setCode] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onCode(code.trim());
      }}
    >
      <div className="grid gap-1">
        <label htmlFor={`${id}-code`} className={label}>
          Check-in code (the party code on the TV)
        </label>
        <input
          id={`${id}-code`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
          }}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          aria-invalid={error ? true : undefined}
          className={`${field} font-gm-display tracking-widest uppercase`}
        />
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {error}
        </p>
      )}
      <Button size="lg" type="submit" disabled={!code.trim()}>
        Open check-in
      </Button>
    </form>
  );
}

function Person({
  guest,
  busy,
  onToggle,
}: {
  guest: GuestRow;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={guest.checkedIn}
        disabled={busy}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-3 rounded-gm px-2 text-left text-lg hover:bg-gm-surface-raised"
      >
        <span
          aria-hidden="true"
          className={cx(
            "grid size-7 shrink-0 place-items-center rounded-[4px] border-2",
            guest.checkedIn
              ? "border-gm-success bg-gm-success text-gm-bg"
              : "border-gm-border bg-gm-surface",
          )}
        >
          {guest.checkedIn && <CheckIcon />}
        </span>
        <span className="min-w-0 flex-1 truncate">{guest.name}</span>
        {guest.source === "door" && (
          <span className="shrink-0 text-xs text-gm-text-muted">Added at the door</span>
        )}
      </button>
    </li>
  );
}

function AddGuest({
  onAdd,
  busy,
}: {
  onAdd: (name: string, family: string) => void;
  busy: boolean;
}) {
  const { Button } = useSlots();
  const id = useId();
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  return (
    <form
      aria-label="Add someone"
      className="grid gap-3 rounded-gm bg-gm-surface p-4 ring-1 ring-gm-border"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name, family);
        setName("");
        setFamily("");
      }}
    >
      <h2 className="m-0 font-gm-display text-2xl font-bold">Add someone</h2>
      <div className="grid gap-1">
        <label htmlFor={`${id}-name`} className={label}>
          Name
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          maxLength={60}
          autoComplete="off"
          className={field}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-family`} className={label}>
          Family (optional)
        </label>
        <input
          id={`${id}-family`}
          value={family}
          onChange={(e) => {
            setFamily(e.target.value);
          }}
          maxLength={60}
          autoComplete="off"
          className={field}
        />
      </div>
      <Button type="submit" disabled={busy || !name.trim()}>
        Add
      </Button>
    </form>
  );
}

export function CheckinPage({ slug }: { slug: string }) {
  const { Button } = useSlots();
  const hydrated = useHydrated();
  // The code typed here; until then the one this phone used before, or none
  // (the admin's own session opens check-in too).
  const [typed, setCode] = useState<string | null | undefined>(undefined);
  const code = typed !== undefined ? typed : hydrated ? storedCode(slug) : undefined;
  const [view, setView] = useState<GuestsView | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(
    async (c: string | null) => {
      const res = await guestsApi.list(slug, c);
      if (res.ok) {
        setView(res.data);
        setLocked(false);
        return true;
      }
      if (!res.offline) {
        setLocked(true);
        setView(null);
      }
      return false;
    },
    [slug],
  );

  // Loads once the code is known, then keeps other helpers' check-ins coming while open.
  useEffect(() => {
    if (code === undefined || locked) return;
    const first = setTimeout(() => void load(code), 0);
    const t = setInterval(() => {
      if (!document.hidden) void load(code);
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [code, locked, load]);

  async function act(body: CheckinAct) {
    setBusy(true);
    setNotice(null);
    const res = await guestsApi.act(slug, code ?? null, body);
    setBusy(false);
    if (res.ok) {
      setView(res.data);
      if (res.data.notice) setNotice(res.data.notice);
    } else setNotice(res.message);
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = groupsOf(view?.guests ?? []);
    return q ? all.filter((g) => g.guests.some((x) => matches(x, q))) : all;
  }, [view, query]);

  if (code === undefined || (!view && !locked))
    return <Skeleton label="Loading the guest list" className="h-40 w-full" />;

  if (locked || !view)
    return (
      <section className="grid gap-4">
        <h1 className="m-0 font-gm-display text-4xl font-bold">Check-in</h1>
        <CodeForm
          error={error}
          onCode={(c) => {
            setError(null);
            void load(c).then((ok) => {
              if (ok) {
                storeCode(slug, c);
                setCode(c);
              } else setError("That check-in code isn't right.");
            });
          }}
        />
      </section>
    );

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="m-0 font-gm-display text-4xl font-bold">Check-in</h1>
        <p className="m-0 text-lg font-bold" aria-live="polite">
          {view.here} of {view.total} here
        </p>
      </div>
      <label className="grid gap-1">
        <span className={label}>Find a name or family</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          autoComplete="off"
          className={field}
        />
      </label>
      {notice && (
        <p role="status" className="m-0 font-bold text-gm-success">
          {notice}
        </p>
      )}
      {view.total === 0 ? (
        <p className="m-0 text-lg text-gm-text-muted">
          No guests yet. The host uploads the RSVP list in Controls, or add people below.
        </p>
      ) : groups.length === 0 ? (
        <p className="m-0 text-lg text-gm-text-muted">Nobody by that name. Add them below.</p>
      ) : (
        <ul aria-label="Guests" className="m-0 grid list-none gap-2 p-0">
          {groups.map((g) => {
            const allIn = g.guests.every((x) => x.checkedIn);
            return (
              <li
                key={g.key}
                className="grid gap-1 rounded-gm bg-gm-surface p-2 ring-1 ring-gm-border"
              >
                {g.family && (
                  <div className="flex items-center justify-between gap-2 px-2">
                    <h2 className="m-0 min-w-0 truncate font-gm-display text-xl font-bold">
                      {g.family}
                    </h2>
                    <Button
                      tone="secondary"
                      disabled={busy || allIn}
                      onClick={() => {
                        void act({
                          action: "checkIn",
                          ids: g.guests.map((x) => x.id),
                          checkedIn: true,
                        });
                      }}
                    >
                      {allIn ? "All here" : "Check in all"}
                    </Button>
                  </div>
                )}
                <ul aria-label={g.family ?? g.guests[0]?.name} className="m-0 grid list-none p-0">
                  {g.guests.map((x) => (
                    <Person
                      key={x.id}
                      guest={x}
                      busy={busy}
                      onToggle={() => {
                        void act({ action: "checkIn", ids: [x.id], checkedIn: !x.checkedIn });
                      }}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
      <AddGuest
        busy={busy}
        onAdd={(name, family) => {
          void act({ action: "add", name, ...(family.trim() ? { family } : {}) });
        }}
      />
    </section>
  );
}
