"use client";

import { useCallback, useId, useState } from "react";
import { AdminButton, Card, field } from "@/components/admin/ui";
import { adminLiveApi, type AdminLiveAct, type AdminLiveView, type Roster } from "@/lib/live";
import { cx } from "@/lib/ui";
import { useLive } from "./use-live";

const STEP_NAME: Record<string, string> = {
  intro: "How to play",
  play: "Playing",
  results: "Results",
  final: "Standings update",
};

type Act = (a: AdminLiveAct) => void;

const swatch = (color: number) => `var(--gm-team-${String(color)})`;

/** What the TV shows: the leaderboard or the showdown, switched any time (S24-AC9). */
function ScreenSwitch({ view, act, busy }: { view: AdminLiveView; act: Act; busy: boolean }) {
  const options = [
    { screen: "leaderboard", label: "Leaderboard" },
    { screen: "showdown", label: "Showdown" },
  ] as const;
  return (
    <div role="group" aria-label="TV shows" className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold">TV shows</span>
      {options.map((o) => (
        <button
          key={o.screen}
          type="button"
          aria-pressed={view.screen === o.screen}
          disabled={busy}
          onClick={() => {
            act({ action: "screen", screen: o.screen });
          }}
          className={cx(
            "min-h-11 rounded-gm border px-4 text-sm font-bold",
            view.screen === o.screen
              ? "border-gm-accent bg-gm-accent text-gm-text-on-accent"
              : "border-gm-border bg-gm-surface text-gm-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Starting a showdown: pick one; a game that can't run with these teams says why (S24-AC11). */
function StartGame({ view, act, busy }: { view: AdminLiveView; act: Act; busy: boolean }) {
  const selectId = useId();
  const [gameId, setGameId] = useState("");
  const chosen = view.games.find((g) => g.id === gameId) ?? view.games[0];
  if (!chosen) return <p className="m-0 text-gm-text-muted">This event has no showdowns.</p>;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-1">
          <label htmlFor={selectId} className="text-sm font-bold">
            Game
          </label>
          <select
            id={selectId}
            value={chosen.id}
            onChange={(e) => {
              setGameId(e.target.value);
            }}
            className={field}
          >
            {view.games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
        <AdminButton
          disabled={busy || chosen.blocked !== null}
          onClick={() => {
            act({ action: "start", gameId: chosen.id });
          }}
        >
          Start on the TV
        </AdminButton>
      </div>
      {chosen.blocked && <p className="m-0 text-sm text-gm-text-muted">{chosen.blocked}</p>}
    </div>
  );
}

/** One team in Who's played: tap a name when they've played (S24-AC2). */
function TeamPlayed({ team, act, busy }: { team: Roster; act: Act; busy: boolean }) {
  const inputId = useId();
  const [name, setName] = useState("");
  return (
    <li className="grid gap-2 border-t border-gm-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ background: swatch(team.color) }}
          />
          <span className="truncate font-bold">{team.name}</span>
          <span className="text-sm text-gm-text-muted tabular-nums">
            {team.done} of {team.total} played
          </span>
        </span>
        {team.everyone && (
          <AdminButton
            tone="secondary"
            disabled={busy}
            onClick={() => {
              act({ action: "reset", teamId: team.teamId });
            }}
          >
            Everyone&apos;s played: start over
          </AdminButton>
        )}
      </div>
      <ul aria-label={`${team.name} people`} className="m-0 flex list-none flex-wrap gap-2 p-0">
        {team.people.map((p) => (
          <li key={p.id} className="flex">
            <button
              type="button"
              aria-pressed={p.played}
              disabled={busy}
              onClick={() => {
                act({ action: "played", teamId: team.teamId, personId: p.id, played: !p.played });
              }}
              className={cx(
                "inline-flex min-h-11 items-center gap-1 border-2 px-3 text-sm font-bold text-gm-text",
                p.added ? "rounded-l-full" : "rounded-full",
                p.played ? "" : "border-dashed border-gm-border bg-gm-surface",
              )}
              style={
                p.played
                  ? {
                      borderColor: swatch(team.color),
                      background: `color-mix(in srgb, ${swatch(team.color)} 40%, transparent)`,
                    }
                  : undefined
              }
            >
              {p.played && <span aria-hidden="true">✓</span>}
              {p.name}
            </button>
            {p.added && (
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                disabled={busy}
                onClick={() => {
                  act({ action: "remove", teamId: team.teamId, personId: p.id });
                }}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-full border-2 border-l-0 border-gm-border bg-gm-surface text-gm-text-muted"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          act({ action: "add", teamId: team.teamId, name });
          setName("");
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Add someone to {team.name}
        </label>
        <input
          id={inputId}
          value={name}
          maxLength={28}
          placeholder="Add someone without a phone"
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
          }}
          className={field}
        />
        <AdminButton type="submit" tone="secondary" disabled={busy || !name.trim()}>
          Add
        </AdminButton>
      </form>
    </li>
  );
}

/** Who's played, every team (S24-AC2, ADR-038). */
export function WhosPlayed({ view, act, busy }: { view: AdminLiveView; act: Act; busy: boolean }) {
  return (
    <Card title="Who's played">
      {view.played.length === 0 ? (
        <p className="m-0 text-gm-text-muted">Teams show here once they&apos;re made.</p>
      ) : (
        <div className="grid gap-3">
          <p className="m-0 text-sm text-pretty text-gm-text-muted">
            Tap someone once they&apos;ve played. Kept all night, across every showdown.
          </p>
          <ul aria-label="Who's played" className="m-0 grid list-none gap-3 p-0">
            {view.played.map((t) => (
              <TeamPlayed key={t.teamId} team={t} act={act} busy={busy} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/**
 * The Showdown card in Controls (S11-AC1, S24-AC1, AC9): what the TV shows,
 * start a showdown, step it with Next (labelled with what it'll do), end it,
 * and see each team's points.
 */
export function LiveCard({ view, act, busy }: { view: AdminLiveView; act: Act; busy: boolean }) {
  return (
    <Card title={view.active ? `Showdown: ${view.session.title}` : "Showdown"}>
      <div className="grid gap-4">
        <ScreenSwitch view={view} act={act} busy={busy} />
        {!view.active ? (
          <StartGame view={view} act={act} busy={busy} />
        ) : (
          <>
            <p className="m-0 font-bold" aria-live="polite">
              {STEP_NAME[view.session.step] ?? view.session.step}
              {view.session.round > 0 &&
                view.session.step !== "final" &&
                ` · round ${String(view.session.round)} of ${String(view.session.rounds)}`}
            </p>
            <div className="flex flex-wrap gap-3">
              {view.next && (
                <AdminButton
                  disabled={busy}
                  onClick={() => {
                    act({ action: "next" });
                  }}
                >
                  {view.next}
                </AdminButton>
              )}
              <AdminButton
                tone="danger"
                disabled={busy}
                onClick={() => {
                  act({ action: "end" });
                }}
              >
                End early
              </AdminButton>
            </div>
            <ul aria-label="Teams in the showdown" className="m-0 grid list-none gap-2 p-0">
              {view.teams.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-gm border border-gm-border px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block size-3 shrink-0 rounded-full"
                      style={{ background: swatch(t.color) }}
                    />
                    <span className="truncate font-bold">{t.name}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {t.roundPoints ? `+${String(t.roundPoints)} · ` : ""}
                    {t.score}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

/** The Showdown card and Who's played, following the session (S11-AC4) and sending the host's actions. */
export function LiveControls({ slug }: { slug: string }) {
  const load = useCallback(() => adminLiveApi.view(slug), [slug]);
  const { view, error, show } = useLive<AdminLiveView>(load);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  if (!view) return null;
  const act: Act = (a) => {
    setBusy(true);
    setRefused(null);
    void adminLiveApi.act(slug, a).then((res) => {
      setBusy(false);
      if (res.ok) show(res.data);
      else setRefused(res.message);
    });
  };
  return (
    <>
      {(refused ?? error) && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {refused ?? error}
        </p>
      )}
      <LiveCard view={view} act={act} busy={busy} />
      <WhosPlayed view={view} act={act} busy={busy} />
    </>
  );
}
