"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import type { EventStatus } from "@/lib/events";
import { AdminButton, Card, field, StatusBadge } from "./ui";

type Player = {
  id: string;
  nickname: string;
  points: number;
  restarts: number;
  joinedAt: number;
  teamId: string | null;
};
type Team = {
  id: string;
  name: string;
  color: number;
  captain: { id: string; nickname: string } | null;
  members: { id: string; nickname: string }[];
  room: number;
};
type Teams = { phase: "individual" | "team"; maxTeamSize: number; teams: Team[] };
type Donation = { id: string; from: string; team: string; points: number; voided: boolean };
type View = {
  status: EventStatus;
  players: Player[];
  teams: Teams | null;
  /** Missing from a server that predates the switches: shown. */
  board?: { phones: boolean; tv: boolean };
  donations?: Donation[];
  jars?: Jar[];
};
type Game = { id: string; title: string; type?: string };
type Jar = {
  gameId: string;
  title: string;
  guesses: number;
  actual: number | null;
  closest: { nickname: string; guess: number; points: number | null }[];
};
type Action =
  | { action: "start" | "end" | "reopen" | "rebuild" }
  | { action: "adjust"; playerId: string; points: number; reason: string }
  | { action: "restart" | "remove" | "ban"; playerId: string }
  | { action: "reset"; playerId: string; gameId: string }
  | { action: "clear"; confirm: string }
  | { action: "phase"; phase: "individual" | "team" }
  | { action: "teamSize"; size: number }
  | { action: "captain"; playerId: string }
  | { action: "moveTeam"; playerId: string; teamId: string }
  | { action: "setCaptain"; teamId: string; playerId: string }
  | { action: "donations" }
  | { action: "voidDonation"; donationId: string }
  | { action: "board"; phones?: boolean; tv?: boolean }
  | { action: "jars" }
  | { action: "scoreJar"; gameId: string; actual: number };

/** Each refresh reads every player, so once a minute (free-tier budget); actions refresh at once. */
const REFRESH_MS = 60_000;

function ago(ms: number, now: number) {
  const mins = Math.round((now - ms) / 60_000);
  if (ms === 0 || mins < 1) return "just now";
  return mins < 60 ? `${String(mins)} min ago` : `${String(Math.round(mins / 60))} h ago`;
}

/** Donations to teams, loaded on request (each costs a read); the host can void one (S03-AC6). */
function DonationsCard({
  donations,
  run,
  busy,
}: {
  donations: Donation[] | null;
  run: (action: Action) => void;
  busy: boolean;
}) {
  return (
    <Card title={donations ? `Donations (${String(donations.length)})` : "Donations"}>
      <div className="grid gap-3">
        <div>
          <AdminButton
            tone="secondary"
            disabled={busy}
            onClick={() => {
              run({ action: "donations" });
            }}
          >
            {donations ? "Refresh donations" : "Show donations"}
          </AdminButton>
        </div>
        {donations?.length === 0 && (
          <p className="m-0 text-sm text-pretty text-gm-text-muted">
            Nobody has given points to a team yet.
          </p>
        )}
        {donations && donations.length > 0 && (
          <ul aria-label="Donations" className="m-0 grid list-none gap-2 p-0">
            {donations.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-gm-border pt-2"
              >
                <span className={d.voided ? "text-gm-text-muted line-through" : ""}>
                  <strong>{d.from}</strong> gave {d.points} to <strong>{d.team}</strong>
                </span>
                {d.voided ? (
                  <span className="text-sm text-gm-text-muted">Voided</span>
                ) : (
                  <Confirm
                    label="Void"
                    sure="Yes, void it"
                    disabled={busy}
                    onConfirm={() => {
                      run({ action: "voidDonation", donationId: d.id });
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/**
 * Show or hide the standings on phones and on the TV, say to keep the
 * winners secret until the end; final standings still show once ended (S07-AC11).
 */
function BoardSwitches({
  board,
  run,
  busy,
}: {
  board: { phones: boolean; tv: boolean };
  run: (action: Action) => void;
  busy: boolean;
}) {
  const row = (where: "phones" | "tv", label: string) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gm-border pt-3">
      <p className="m-0 font-bold">
        {label}:{" "}
        <span className={board[where] ? "" : "text-gm-danger"}>
          {board[where] ? "Shown" : "Hidden"}
        </span>
      </p>
      <AdminButton
        tone="secondary"
        disabled={busy}
        aria-pressed={!board[where]}
        onClick={() => {
          run({ action: "board", [where]: !board[where] });
        }}
      >
        {board[where]
          ? `Hide on ${where === "tv" ? "the TV" : "phones"}`
          : `Show on ${where === "tv" ? "the TV" : "phones"}`}
      </AdminButton>
    </div>
  );
  return (
    <div className="mt-3 grid gap-3">
      {row("phones", "Leaderboard on phones")}
      {row("tv", "Leaderboard on the TV")}
    </div>
  );
}

/**
 * Guessing Jars: load the guesses (each costs a read), enter the real count
 * and score it; the closest guesses show after (S17-AC3).
 */
function JarsCard({
  jars,
  titles,
  run,
  busy,
}: {
  jars: Jar[] | null;
  titles: Game[];
  run: (action: Action) => void;
  busy: boolean;
}) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  return (
    <Card title="Guessing Jar">
      <div className="grid gap-4">
        <div>
          <AdminButton
            tone="secondary"
            disabled={busy}
            onClick={() => {
              run({ action: "jars" });
            }}
          >
            {jars ? "Refresh guesses" : "Show guesses"}
          </AdminButton>
        </div>
        {jars?.map((j) => {
          const count = Number(counts[j.gameId] ?? "");
          const ready = (counts[j.gameId] ?? "") !== "" && Number.isInteger(count);
          return (
            <section
              key={j.gameId}
              aria-label={j.title}
              className="grid gap-3 border-t border-gm-border pt-3"
            >
              <p className="m-0 font-bold">
                {titles.find((t) => t.id === j.gameId)?.title ?? j.title}: {j.guesses} guesses
                {j.actual !== null && ` · scored with ${String(j.actual)}`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`count-${j.gameId}`}>
                  Real count
                </label>
                <input
                  id={`count-${j.gameId}`}
                  inputMode="numeric"
                  placeholder="Real count"
                  value={counts[j.gameId] ?? ""}
                  onChange={(e) => {
                    setCounts((c) => ({ ...c, [j.gameId]: e.target.value.replace(/\D/g, "") }));
                  }}
                  className={`${field} max-w-40`}
                />
                <Confirm
                  label={j.actual === null ? "Score the jar" : "Score it again"}
                  sure={`Yes, the jar has ${String(count)}`}
                  tone="primary"
                  disabled={busy || !ready}
                  onConfirm={() => {
                    run({ action: "scoreJar", gameId: j.gameId, actual: count });
                  }}
                />
              </div>
              {j.closest.length > 0 && j.actual !== null && (
                <ol aria-label={`Closest guesses for ${j.title}`} className="m-0 grid gap-1 pl-5">
                  {j.closest.map((g) => (
                    <li key={g.nickname}>
                      <strong>{g.nickname}</strong> guessed {g.guess} · {g.points ?? 0} points
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

/** A button that asks once more before doing something hard to undo. */
function Confirm({
  label,
  sure,
  onConfirm,
  tone = "danger",
  disabled,
}: {
  label: string;
  sure: string;
  onConfirm: () => void;
  tone?: "primary" | "danger";
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <AdminButton
        tone={tone === "danger" ? "danger" : "primary"}
        disabled={disabled ?? false}
        onClick={() => {
          setAsking(true);
        }}
      >
        {label}
      </AdminButton>
    );
  return (
    <span className="inline-flex flex-wrap gap-2">
      <AdminButton
        tone="danger"
        disabled={disabled ?? false}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {sure}
      </AdminButton>
      <AdminButton
        tone="secondary"
        onClick={() => {
          setAsking(false);
        }}
      >
        Cancel
      </AdminButton>
    </span>
  );
}

function PlayerTools({
  player,
  games,
  teams,
  run,
  busy,
}: {
  player: Player;
  games: Game[];
  teams: Teams | null;
  run: (a: Action) => void;
  busy: boolean;
}) {
  const id = useId();
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const others = teams?.teams.filter((t) => t.id !== player.teamId) ?? [];
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  const amount = Number(points);
  return (
    <div className="grid gap-4 border-t border-gm-border bg-gm-bg p-3">
      <form
        className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run({ action: "adjust", playerId: player.id, points: amount, reason });
          setPoints("");
          setReason("");
        }}
      >
        <label className="sr-only" htmlFor={`${id}-pts`}>
          Points to add (negative to take away)
        </label>
        <input
          id={`${id}-pts`}
          inputMode="numeric"
          placeholder="+50 or -20"
          value={points}
          onChange={(e) => {
            setPoints(e.target.value);
          }}
          className={field}
        />
        <label className="sr-only" htmlFor={`${id}-why`}>
          Reason
        </label>
        <input
          id={`${id}-why`}
          placeholder="Reason, like Best costume"
          maxLength={120}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
          className={field}
        />
        <AdminButton type="submit" disabled={busy || !Number.isInteger(amount) || amount === 0}>
          Change points
        </AdminButton>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton
          tone="secondary"
          disabled={busy}
          onClick={() => {
            run({ action: "restart", playerId: player.id });
          }}
        >
          Give another restart
        </AdminButton>
        <label className="sr-only" htmlFor={`${id}-game`}>
          Game to reset
        </label>
        <select
          id={`${id}-game`}
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value);
          }}
          className={`${field} w-auto`}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <Confirm
          label="Reset game"
          sure="Reset it"
          disabled={busy || !gameId}
          onConfirm={() => {
            run({ action: "reset", playerId: player.id, gameId });
          }}
        />
        {teams && !player.teamId && (
          <AdminButton
            tone="secondary"
            disabled={busy}
            onClick={() => {
              run({ action: "captain", playerId: player.id });
            }}
          >
            Make captain
          </AdminButton>
        )}
        {teams && others.length > 0 && (
          <span className="inline-flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`${id}-team`}>
              Team to move to
            </label>
            <select
              id={`${id}-team`}
              value={moveTo}
              onChange={(e) => {
                setMoveTo(e.target.value);
              }}
              className={`${field} w-auto`}
            >
              {others.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <AdminButton
              tone="secondary"
              disabled={busy || !moveTo}
              onClick={() => {
                run({ action: "moveTeam", playerId: player.id, teamId: moveTo });
              }}
            >
              Move to team
            </AdminButton>
          </span>
        )}
        <Confirm
          label="Remove"
          sure={`Remove ${player.nickname}`}
          disabled={busy}
          onConfirm={() => {
            run({ action: "remove", playerId: player.id });
          }}
        />
        <Confirm
          label="Ban phone"
          sure="Ban this phone"
          disabled={busy}
          onConfirm={() => {
            run({ action: "ban", playerId: player.id });
          }}
        />
      </div>
    </div>
  );
}

function TeamsCard({
  teams,
  players,
  run,
  busy,
}: {
  teams: Teams;
  players: number;
  run: (a: Action) => void;
  busy: boolean;
}) {
  const sizeId = useId();
  const [size, setSize] = useState(String(teams.maxTeamSize));
  const suggested = Math.max(1, Math.ceil(players / Math.max(1, teams.teams.length)));
  return (
    <Card title={`Teams (${String(teams.teams.length)})`}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold">
            Phase: {teams.phase === "team" ? "Team" : "Individual"}
          </span>
          {teams.phase === "individual" ? (
            <Confirm
              label="Start the team phase"
              sure="Yes, start teams"
              tone="primary"
              disabled={busy}
              onConfirm={() => {
                run({ action: "phase", phase: "team" });
              }}
            />
          ) : (
            <Confirm
              label="Back to individual"
              sure="Yes, go back"
              tone="primary"
              disabled={busy}
              onConfirm={() => {
                run({ action: "phase", phase: "individual" });
              }}
            />
          )}
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run({ action: "teamSize", size: Number(size) });
          }}
        >
          <label htmlFor={sizeId} className="grid gap-1 text-sm font-bold">
            Max team size
            <input
              id={sizeId}
              inputMode="numeric"
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
              }}
              className={`${field} w-24`}
            />
          </label>
          <AdminButton type="submit" tone="secondary" disabled={busy || !/^[0-9]+$/.test(size)}>
            Save size
          </AdminButton>
          <span className="text-sm text-gm-text-muted">
            Suggested: {suggested} ({players} players ÷ {teams.teams.length || 1} teams)
          </span>
        </form>
        {teams.teams.length === 0 ? (
          <p className="m-0 text-sm text-pretty text-gm-text-muted">
            No teams yet. Open a player below and tap Make captain.
          </p>
        ) : (
          <ul aria-label="Teams" className="m-0 grid list-none gap-2 p-0">
            {teams.teams.map((t) => (
              <li key={t.id} className="grid gap-2 rounded-gm border border-gm-border p-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{ background: `var(--gm-team-${String(t.color)})` }}
                  />
                  <span className="font-bold">{t.name}</span>
                  <span className="ml-auto text-sm text-gm-text-muted">
                    {t.members.length} / {teams.maxTeamSize}
                  </span>
                </div>
                <p className="m-0 text-sm text-pretty text-gm-text-muted">
                  {t.members.map((m) => m.nickname).join(", ") || "No members"}
                </p>
                {t.members.length > 1 && (
                  <label className="flex flex-wrap items-center gap-2 text-sm">
                    Captain
                    <select
                      value={t.captain?.id ?? ""}
                      disabled={busy}
                      onChange={(e) => {
                        run({ action: "setCaptain", teamId: t.id, playerId: e.target.value });
                      }}
                      className={`${field} w-auto`}
                    >
                      {!t.captain && <option value="">Pick a captain</option>}
                      {t.members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nickname}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/** The host's page for one event: Start and End, players and their fix-ups, and tools (spec 07). */
export function Controls({
  slug,
  name,
  games,
  initial,
}: {
  slug: string;
  name: string;
  games: Game[];
  initial: View;
}) {
  const [view, setView] = useState(initial);
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [jars, setJars] = useState<Jar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const searchId = useId();

  const refresh = useCallback(async () => {
    // A hidden tab doesn't refresh: every refresh reads each player (free-tier budget).
    if (document.hidden) return;
    const res = await fetch(`/api/admin/events/${slug}`).catch(() => null);
    if (res?.ok) setView((await res.json()) as View);
    setNow(Date.now());
  }, [slug]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      clearInterval(timer);
    };
  }, [refresh]);

  const run = (action: Action) => {
    setBusy(true);
    setError(null);
    void fetch(`/api/admin/events/${slug}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action),
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (View & { error?: string }) | null;
        if (res.ok && body) {
          setView(body);
          if (body.donations) setDonations(body.donations);
          if (body.jars) setJars(body.jars);
        } else setError(body?.error ?? "That didn't work. Try again.");
      })
      .catch(() => {
        setError("We couldn't reach the server. Try again.");
      })
      .finally(() => {
        setBusy(false);
        setNow(Date.now());
      });
  };

  const shown = view.players.filter((p) =>
    p.nickname.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6">
      <div className="grid gap-1">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-sm font-bold text-gm-accent-ink"
        >
          ← All events
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-2xl font-bold">{name}</h1>
          <StatusBadge status={view.status} />
        </div>
        <p className="m-0 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/${slug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center font-bold text-gm-accent-ink"
          >
            Party page ↗
          </Link>
          <Link
            href={`/${slug}/display`}
            target="_blank"
            className="inline-flex min-h-11 items-center font-bold text-gm-accent-ink"
          >
            TV display ↗
          </Link>
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="m-0 rounded-gm border border-gm-danger bg-gm-surface px-3 py-2 text-sm font-bold text-gm-danger"
        >
          {error}
        </p>
      )}

      <Card title="Event">
        <div className="flex flex-wrap items-center gap-3">
          {view.status === "upcoming" && (
            <AdminButton
              disabled={busy}
              onClick={() => {
                run({ action: "start" });
              }}
            >
              Start the event
            </AdminButton>
          )}
          {view.status === "live" && (
            <Confirm
              label="End the event"
              sure="Yes, end it"
              disabled={busy}
              onConfirm={() => {
                run({ action: "end" });
              }}
            />
          )}
          {view.status === "ended" && (
            <Confirm
              label="Reopen"
              sure="Yes, reopen it"
              tone="primary"
              disabled={busy}
              onConfirm={() => {
                run({ action: "reopen" });
              }}
            />
          )}
          <p className="m-0 text-sm text-pretty text-gm-text-muted">
            {view.status === "upcoming" &&
              "Games open when you start (except ones that are always open)."}
            {view.status === "live" && "Games are open."}
            {view.status === "ended" && "Games are closed and final standings show."}
          </p>
        </div>
        <BoardSwitches board={view.board ?? { phones: true, tv: true }} run={run} busy={busy} />
      </Card>

      {view.teams && (
        <>
          <TeamsCard teams={view.teams} players={view.players.length} run={run} busy={busy} />
          <DonationsCard donations={donations} run={run} busy={busy} />
        </>
      )}

      {games.some((g) => g.type === "jar") && (
        <JarsCard jars={jars} titles={games} run={run} busy={busy} />
      )}

      <Card title={`Players (${String(view.players.length)})`}>
        <div className="grid gap-3">
          <label htmlFor={searchId} className="sr-only">
            Find a player
          </label>
          <input
            id={searchId}
            type="search"
            placeholder="Find a player"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className={field}
          />
          {shown.length === 0 ? (
            <p className="m-0 text-gm-text-muted">
              {view.players.length === 0 ? "No players yet." : "No one by that name."}
            </p>
          ) : (
            <ul aria-label="Players" className="m-0 grid list-none gap-2 p-0">
              {shown.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-gm border border-gm-border">
                  <button
                    type="button"
                    aria-expanded={open === p.id}
                    onClick={() => {
                      setOpen(open === p.id ? null : p.id);
                    }}
                    className="flex min-h-12 w-full items-center justify-between gap-3 bg-gm-surface px-3 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{p.nickname}</span>
                      <span className="block text-xs text-gm-text-muted">
                        Joined {ago(p.joinedAt, now)}
                        {p.restarts > 0 && ` · started over ${String(p.restarts)}×`}
                      </span>
                    </span>
                    <span className="shrink-0 text-lg font-bold tabular-nums">{p.points}</span>
                  </button>
                  {open === p.id && (
                    <PlayerTools
                      player={p}
                      games={games}
                      teams={view.teams}
                      run={run}
                      busy={busy}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card title="Tools">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton
              tone="secondary"
              disabled={busy}
              onClick={() => {
                run({ action: "rebuild" });
              }}
            >
              Rebuild points
            </AdminButton>
            <p className="m-0 text-sm text-pretty text-gm-text-muted">
              Recounts everyone&apos;s points if totals look wrong.
            </p>
          </div>
          {view.status === "upcoming" && (
            <form
              className="grid gap-2 rounded-gm border border-gm-danger p-3"
              onSubmit={(e) => {
                e.preventDefault();
                run({ action: "clear", confirm: confirmText });
                setConfirmText("");
              }}
            >
              <p className="m-0 font-bold text-gm-danger">Clear test data</p>
              <p className="m-0 text-sm text-pretty text-gm-text-muted">
                Deletes every player, score and the leaderboard for this event. It can&apos;t be
                undone. Type CLEAR to confirm.
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor={`${searchId}-clear`}>
                  Type CLEAR
                </label>
                <input
                  id={`${searchId}-clear`}
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                  }}
                  className={`${field} w-40`}
                />
                <AdminButton
                  type="submit"
                  tone="danger"
                  disabled={busy || confirmText.trim() !== "CLEAR"}
                >
                  Clear test data
                </AdminButton>
              </div>
            </form>
          )}
        </div>
      </Card>
    </main>
  );
}
