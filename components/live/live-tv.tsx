"use client";

import { cx } from "@/lib/ui";
import { DemoFrame } from "./demo-frame";
import { LIVE_RENDERERS } from "./renderers";
import type { ActiveLiveView, LiveRenderer } from "./types";

const teamColor = (color: number) => `var(--gm-team-${String(color)})`;

/** Who's up for each team: on the pick step, and beside the game (S24-AC2). */
function TeamStrip({ view, points }: { view: ActiveLiveView; points: boolean }) {
  return (
    <ul
      aria-label="Teams"
      className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3 p-0"
    >
      {view.teams.map((t) => (
        <li
          key={t.id}
          className="grid gap-1 rounded-gm bg-gm-surface px-4 py-3 ring-1 ring-gm-border"
          style={{ borderLeft: `0.5rem solid ${teamColor(t.color)}` }}
        >
          <span className="font-gm-display text-[clamp(1.1rem,2.4vmin,2rem)] font-bold">
            {t.name}
          </span>
          <span className="text-[clamp(0.9rem,1.8vmin,1.5rem)] text-gm-text-muted">
            {t.up ? t.up.nickname : view.session.step === "pick" ? "Picking…" : "—"}
          </span>
          {points && (
            <span className="font-gm-display text-[clamp(1.2rem,2.6vmin,2.2rem)] font-bold tabular-nums">
              {t.roundPoints !== null && t.roundPoints > 0 ? `+${String(t.roundPoints)} · ` : ""}
              {t.score}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Final standings for the showdown, best first. */
function Standings({ view }: { view: ActiveLiveView }) {
  const ranked = [...view.teams].sort((a, b) => b.score - a.score);
  return (
    <ol aria-label="Final standings" className="m-0 grid list-none gap-3 p-0">
      {ranked.map((t, i) => (
        <li
          key={t.id}
          className={cx(
            "flex items-center justify-between gap-6 rounded-gm bg-gm-surface px-6 py-4 ring-1 ring-gm-border",
            i === 0 && "ring-4 ring-gm-tile-correct",
          )}
          style={{ borderLeft: `0.6rem solid ${teamColor(t.color)}` }}
        >
          <span className="font-gm-display text-[clamp(1.4rem,3.4vmin,3rem)] font-bold">
            {i + 1}. {t.name}
          </span>
          <span className="font-gm-display text-[clamp(1.6rem,4vmin,3.6rem)] font-bold tabular-nums">
            {t.score}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A live game on the TV (specs 11, 24): the demo, who's up, the game itself,
 * results and final standings, each step as the host moves it on.
 */
export function LiveTv({
  view,
  serverNow,
  renderers = LIVE_RENDERERS,
}: {
  view: ActiveLiveView;
  serverNow: () => number;
  renderers?: Readonly<Record<string, LiveRenderer>>;
}) {
  const renderer = renderers[view.session.type];
  const { step, round, rounds, title } = view.session;
  const revealed = step === "results";
  return (
    <section aria-label={`${title} on the TV`} className="grid gap-[3vmin] p-[3vmin]">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="m-0 font-gm-display text-[clamp(2rem,5vmin,4.5rem)] font-bold">{title}</h2>
        {round > 0 && step !== "final" && (
          <p className="m-0 font-gm-display text-[clamp(1.2rem,3vmin,2.6rem)] font-bold text-gm-text-muted">
            Round {round} of {rounds}
          </p>
        )}
      </header>
      {step === "intro" && <DemoFrame renderer={renderer} line={view.demo} />}
      {step === "pick" && (
        <>
          <p className="m-0 text-center font-gm-display text-[clamp(1.6rem,4vmin,3.4rem)] font-bold">
            Who&apos;s up? Captains, pick a player.
          </p>
          <TeamStrip view={view} points={false} />
        </>
      )}
      {(step === "play" || step === "results") && renderer && (
        <>
          <renderer.Tv view={view} game={view.game} serverNow={serverNow} revealed={revealed} />
          <TeamStrip view={view} points={revealed} />
        </>
      )}
      {step === "final" && <Standings view={view} />}
    </section>
  );
}
