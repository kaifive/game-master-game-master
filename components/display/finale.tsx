"use client";

import { useSlots } from "@/components/slots/registry";
import { DressedSelfie } from "@/components/stickers/stickers";
import type { DisplayStandings } from "@/lib/points";

/**
 * The finale on the TV (spec 31): once the event has ended, the winning
 * team's selfie held up like a judge's card in the team's color, its stickers
 * popping on one by one, with its name and points. A tie shows each winner.
 */
export function Finale({ finale }: { finale: NonNullable<DisplayStandings["finale"]> }) {
  const { ScoreCard } = useSlots();
  const tie = finale.teams.length > 1;
  return (
    <section
      aria-label="Champions"
      className="grid h-full content-center justify-items-center gap-[1.6vh] text-center"
    >
      <p className="m-0 font-gm-display text-[clamp(2rem,6vh,4.5rem)] leading-none font-bold text-gm-tile-correct">
        Champions!
      </p>
      <ul
        className="m-0 grid list-none items-start gap-[3vh] p-0"
        style={{ gridTemplateColumns: `repeat(${String(finale.teams.length)}, minmax(0, 1fr))` }}
      >
        {finale.teams.map((t) => (
          <li key={t.teamId} className="grid justify-items-center gap-[1.6vh]">
            {t.selfie ? (
              <div
                className="rounded-[4px] p-[1.2vh] shadow-2xl"
                style={{ background: `var(--gm-team-${String(t.color)})` }}
              >
                <DressedSelfie
                  url={t.selfie.url}
                  width={t.selfie.width}
                  height={t.selfie.height}
                  stickers={t.stickers}
                  alt={`${t.name}, dressed up`}
                  pop
                  className={tie ? "h-[36vh] max-w-[30vw]" : "h-[44vh] max-w-[60vw]"}
                />
              </div>
            ) : (
              <div
                className="grid aspect-[4/3] h-[36vh] place-items-center rounded-[4px] font-gm-display text-[clamp(2rem,7vh,5rem)] font-bold text-gm-bg shadow-2xl"
                style={{ background: `var(--gm-team-${String(t.color)})` }}
              >
                {t.name}
              </div>
            )}
            <p className="m-0 font-gm-display text-[clamp(1.8rem,5vh,3.8rem)] leading-none font-bold">
              {t.name}
            </p>
          </li>
        ))}
      </ul>
      <ScoreCard
        label={`Winning score: ${String(finale.points)}`}
        value={finale.points}
        state="highlight"
        size="lg"
        fresh
      />
    </section>
  );
}
