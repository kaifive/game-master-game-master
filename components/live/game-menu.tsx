"use client";

import { useEffect, useState } from "react";
import type { AdminLiveAct } from "@/lib/live";
import { CheckIcon } from "@/components/icons/game";
import { cx } from "@/lib/ui";
import { Swatch } from "./games/shared";
import type { TeamTotal } from "./live-tv";
import { useHeld } from "./use-live";

/** A showdown on the TV's menu (spec 24). */
export type MenuGame = { id: string; title: string; type: string };

/** What the TV can do when its browser is signed in as the host (Khai, 2026-11-24). */
export type TvHost = {
  act: (a: AdminLiveAct) => void;
  busy: boolean;
  /** Why a game can't start with the teams there are, by game id. */
  blocked: Record<string, string | null>;
  /** What Next does now, while a showdown runs. */
  next: string | null;
  /** How long Next waits while the round counts down (QA, 2026-11-25). */
  nextInMs: number | null;
  /** The step Next would be pressed on, so a late press does nothing. */
  at: { step: string; round: number } | null;
};

/** The team standings, small, beside the menu. */
function MiniStandings({ totals }: { totals: readonly TeamTotal[] }) {
  const ranked = [...totals].sort((a, b) => b.points - a.points);
  return (
    <section aria-label="Team standings" className="grid content-start gap-[1.2vh]">
      <h3 className="m-0 font-gm-display text-[clamp(1.4rem,3.4vh,2.6rem)] font-bold">Teams</h3>
      {ranked.length === 0 ? (
        <p className="m-0 text-[clamp(1rem,2.4vh,1.8rem)] text-gm-text-muted">
          Teams show here once they&apos;re made.
        </p>
      ) : (
        <ol className="m-0 grid list-none gap-[0.8vh] p-0">
          {ranked.map((t, i) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-gm bg-gm-surface px-4 py-[1vh] text-[clamp(1rem,2.6vh,1.9rem)] ring-1 ring-gm-border"
            >
              <span className="w-[1.4em] font-gm-display font-bold tabular-nums">{i + 1}</span>
              <Swatch color={t.color} />
              <span className="min-w-0 flex-1 truncate font-bold">{t.name}</span>
              <span className="font-gm-display font-bold tabular-nums">{t.points}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Between showdowns, the TV shows the menu of showdowns, the ones already
 * played marked, and the team standings beside it (Khai, 2026-11-24). With
 * the host signed in on the TV, a tap starts one.
 */
export function GameMenu({
  games,
  totals,
  host,
  played = [],
}: {
  games: readonly MenuGame[];
  totals: readonly TeamTotal[];
  host?: TvHost | null;
  /** Game ids already played tonight: marked, and still startable again. */
  played?: readonly string[];
}) {
  // One reason that holds for every game (no teams yet) is said once, not on every card.
  const reasons = host ? games.map((g) => host.blocked[g.id] ?? null) : [];
  const shared =
    reasons.length > 0 && reasons.every((r) => r !== null && r === reasons[0]) ? reasons[0] : null;
  return (
    <section
      aria-label="Showdowns"
      className="grid h-full grid-cols-[1fr_minmax(0,24rem)] content-start gap-[4vmin] p-[3vmin]"
    >
      <div className="grid content-start gap-[2vh]">
        <h2 className="m-0 font-gm-display text-[clamp(2rem,5vmin,4.5rem)] font-bold">Showdowns</h2>
        {shared && (
          <p className="m-0 text-[clamp(1rem,2.4vh,1.8rem)] font-bold text-gm-text-muted">
            {shared}
          </p>
        )}
        {/* Every showdown fits one screen: the TV never scrolls (DESIGN.md). */}
        <ul
          className="m-0 grid list-none gap-[1.2vh] p-0"
          style={{
            gridTemplateColumns: `repeat(${String(games.length > 12 ? 5 : games.length > 6 ? 4 : 3)}, minmax(0, 1fr))`,
          }}
        >
          {games.map((g) => {
            const blocked = host?.blocked[g.id] ?? null;
            const done = played.includes(g.id);
            const inner = (
              <>
                <span className="font-gm-display text-[clamp(1.2rem,3vh,2.4rem)] leading-tight font-bold">
                  {g.title}
                </span>
                {done && (
                  <span className="inline-flex items-center gap-[0.5vh] text-[clamp(0.9rem,2vh,1.5rem)] font-bold text-gm-text-muted">
                    <CheckIcon size={18} />
                    Played
                  </span>
                )}
                {host && !shared && (
                  <span
                    className={cx(
                      "mt-[0.6vh] text-[clamp(0.9rem,2vh,1.5rem)] font-bold",
                      blocked ? "text-gm-text-muted" : "text-gm-accent-ink",
                    )}
                  >
                    {blocked ?? "Start"}
                  </span>
                )}
              </>
            );
            const look = cx(
              "grid h-full content-start gap-[0.4vh] rounded-gm px-[1.6vh] py-[1.4vh] text-left ring-1 ring-gm-border",
              // A played game sinks back, so what's left stands out.
              done ? "bg-gm-bg opacity-70" : "bg-gm-surface",
            );
            return (
              <li key={g.id}>
                {host ? (
                  <button
                    type="button"
                    disabled={host.busy || blocked !== null}
                    aria-label={`Start ${g.title}`}
                    onClick={() => {
                      host.act({ action: "start", gameId: g.id });
                    }}
                    className={cx(
                      look,
                      "w-full hover:ring-gm-accent-ink focus-visible:ring-4 disabled:opacity-60",
                    )}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className={look}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <MiniStandings totals={totals} />
    </section>
  );
}

/**
 * End early, asked twice: the first tap turns it into "Yes, end it" for a few
 * seconds, so a slip next to Next can't end a showdown (QA, 2026-11-25).
 */
export function EndEarly({
  onEnd,
  disabled,
  className,
}: {
  onEnd: () => void;
  disabled: boolean;
  className: string;
}) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => {
      setAsking(false);
    }, 4000);
    return () => {
      clearTimeout(t);
    };
  }, [asking]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (asking) {
          setAsking(false);
          onEnd();
        } else setAsking(true);
      }}
      className={className}
    >
      {asking ? "Yes, end it" : "End early"}
    </button>
  );
}

/**
 * The host's buttons on the TV, small in a corner, while signed in: Next and
 * End during a showdown, and switching between the board and the showdowns.
 */
export function TvHostBar({
  host,
  running,
  screen,
}: {
  host: TvHost;
  running: boolean;
  screen: "leaderboard" | "showdown";
}) {
  // Not the leaderboard mid-round: the round would vanish from the room (QA, 2026-11-25).
  const midRound = running && host.at?.step === "play" && screen === "showdown";
  const held = useHeld(host.nextInMs);
  const button =
    "min-h-11 rounded-gm px-4 font-bold ring-1 ring-gm-border bg-gm-surface hover:bg-gm-surface-raised disabled:opacity-50";
  return (
    <nav
      aria-label="Host controls"
      className="fixed right-[1.5vmin] bottom-[1.5vmin] z-40 flex gap-2 rounded-gm bg-gm-bg/80 p-2 text-base shadow-xl backdrop-blur"
    >
      {running && host.next && (
        <button
          type="button"
          disabled={host.busy || held}
          onClick={() => {
            host.act(host.at ? { action: "next", at: host.at } : { action: "next" });
          }}
          className={cx(button, "bg-gm-accent text-gm-text-on-accent hover:bg-gm-accent-hover")}
        >
          {host.next}
        </button>
      )}
      {running && host.at?.step !== "final" && (
        <EndEarly
          disabled={host.busy}
          onEnd={() => {
            host.act({ action: "end" });
          }}
          className={button}
        />
      )}
      <button
        type="button"
        disabled={host.busy || midRound}
        title={midRound ? "Leaderboard after the round" : undefined}
        onClick={() => {
          host.act({
            action: "screen",
            screen: screen === "showdown" ? "leaderboard" : "showdown",
          });
        }}
        className={button}
      >
        {screen === "showdown" ? "Leaderboard" : "Showdowns"}
      </button>
    </nav>
  );
}
