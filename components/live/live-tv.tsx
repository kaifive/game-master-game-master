"use client";

import { BarRace } from "@/components/motion";
import type { LiveView } from "@/lib/live";
import { DemoFrame } from "./demo-frame";
import { LIVE_RENDERERS } from "./renderers";
import { StandingsUpdate, type StandingsRow } from "./standings-update";
import type { ActiveLiveView, LiveRenderer } from "./types";

/** The event's team totals, from the display's standings (spec 05). */
export type TeamTotal = { id: string; name: string; color: number; points: number };

/** The update for the final step: the showdown's points rolled onto each team's event total. */
export function standingsRows(view: ActiveLiveView, totals: readonly TeamTotal[]): StandingsRow[] {
  const won = new Map(view.teams.map((t) => [t.id, t.score]));
  const rows: StandingsRow[] = totals.map((t) => {
    const gained = won.get(t.id) ?? 0;
    return { id: t.id, name: t.name, color: t.color, before: t.points - gained, after: t.points };
  });
  // Without event totals (the board hidden), the showdown's own scores stand in.
  for (const t of view.teams)
    if (!rows.some((r) => r.id === t.id))
      rows.push({ id: t.id, name: t.name, color: t.color, before: 0, after: t.score });
  return rows;
}

/**
 * A live game on the TV (specs 11, 24): the demo, the game itself, results
 * and the standings update, each step as the host moves it on.
 */
export function LiveTv({
  view,
  serverNow,
  totals = [],
  renderers = LIVE_RENDERERS,
}: {
  view: ActiveLiveView;
  serverNow: () => number;
  totals?: readonly TeamTotal[];
  renderers?: Readonly<Record<string, LiveRenderer>>;
}) {
  const renderer = renderers[view.session.type];
  const { step, round, rounds, title } = view.session;
  const revealed = step === "results";
  return (
    <section
      aria-label={`${title} on the TV`}
      className="grid h-full content-start gap-[3vmin] p-[3vmin]"
    >
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="m-0 font-gm-display text-[clamp(2rem,5vmin,4.5rem)] font-bold">{title}</h2>
        {round > 0 && step !== "final" && (
          <p className="m-0 font-gm-display text-[clamp(1.2rem,3vmin,2.6rem)] font-bold text-gm-text-muted">
            Round {round} of {rounds}
          </p>
        )}
      </header>
      {step === "intro" && <DemoFrame renderer={renderer} line={view.demo} />}
      {(step === "play" || step === "results") && renderer && (
        <renderer.Tv view={view} game={view.game} serverNow={serverNow} revealed={revealed} />
      )}
      {step === "final" && <StandingsUpdate rows={standingsRows(view, totals)} />}
    </section>
  );
}

/**
 * The TV's Showdown screen (S24-AC9): the showdown while one runs, and the
 * team standings in between.
 */
export function ShowdownScreen({
  view,
  serverNow,
  totals,
  renderers,
}: {
  view: LiveView;
  serverNow: () => number;
  totals: readonly TeamTotal[];
  renderers?: Readonly<Record<string, LiveRenderer>>;
}) {
  if (view.active)
    return (
      <LiveTv
        view={view}
        serverNow={serverNow}
        totals={totals}
        {...(renderers ? { renderers } : {})}
      />
    );
  return (
    <section aria-label="Showdown" className="grid h-full content-start gap-[3vmin] p-[3vmin]">
      <h2 className="m-0 font-gm-display text-[clamp(2rem,5vmin,4.5rem)] font-bold">
        Next showdown coming up
      </h2>
      {totals.length > 0 ? (
        <div className="text-[clamp(1rem,2.4vh,1.8rem)]">
          <BarRace
            label="Team standings"
            entries={totals.map((t) => ({
              id: t.id,
              name: t.name,
              score: t.points,
              team: t.color,
            }))}
          />
        </div>
      ) : (
        <p className="m-0 text-[clamp(1.2rem,3vmin,2.4rem)] text-gm-text-muted">
          Teams show here once they&apos;re made.
        </p>
      )}
    </section>
  );
}
