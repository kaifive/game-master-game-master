"use client";

import type { LiveView } from "@/lib/live";
import { cx } from "@/lib/ui";
import { DemoFrame } from "./demo-frame";
import { GameMenu, type MenuGame, type TvHost } from "./game-menu";
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
      <header
        className={cx(
          "flex items-baseline gap-4",
          // On the intro the name sits centered over the demo (Khai, 2026-11-24).
          step === "intro" ? "justify-center" : "justify-between",
        )}
      >
        <h2
          className={cx(
            "m-0 font-gm-display font-bold",
            step === "intro"
              ? "text-[clamp(2.6rem,7vmin,6rem)]"
              : "text-[clamp(2rem,5vmin,4.5rem)]",
          )}
        >
          {title}
        </h2>
        {round > 0 && step !== "final" && (
          <p className="m-0 font-gm-display text-[clamp(1.4rem,3.6vmin,3rem)] font-bold">
            Round {round} of {rounds}
          </p>
        )}
      </header>
      {step === "intro" && (
        <DemoFrame renderer={renderer} line={view.demo} timeout={view.timeout} />
      )}
      {(step === "play" || step === "results") && renderer && (
        <renderer.Tv view={view} game={view.game} serverNow={serverNow} revealed={revealed} />
      )}
      {step === "final" && (
        <>
          <p className="m-0 font-gm-display text-[clamp(1.6rem,4vh,3rem)] font-bold">
            Team standings for the whole party
          </p>
          <StandingsUpdate rows={standingsRows(view, totals)} />
        </>
      )}
    </section>
  );
}

/**
 * The TV's Showdown screen (S24-AC9): the showdown while one runs, and the
 * menu of showdowns with the team standings in between (Khai, 2026-11-24).
 */
export function ShowdownScreen({
  view,
  serverNow,
  totals,
  renderers,
  menu = [],
  host = null,
}: {
  view: LiveView;
  serverNow: () => number;
  totals: readonly TeamTotal[];
  renderers?: Readonly<Record<string, LiveRenderer>>;
  /** The event's showdowns, for the menu between them. */
  menu?: readonly MenuGame[];
  /** The host's controls, when the TV is signed in as the host. */
  host?: TvHost | null;
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
  return <GameMenu games={menu} totals={totals} host={host} played={view.finished ?? []} />;
}
