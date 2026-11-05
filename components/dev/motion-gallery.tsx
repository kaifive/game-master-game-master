"use client";

import { useState } from "react";
import {
  BarRace,
  CountUp,
  MomentsProvider,
  MomentsStage,
  PointsBurst,
  ToastChainView,
  useCelebrate,
  type BarRaceEntry,
} from "@/components/motion";
import { useSlots } from "@/components/slots/registry";
import { MOMENT_KINDS, type MomentKind } from "@/lib/motion";

export const PRIMITIVES = ["CountUp", "BarRace", "PointsBurst"] as const;

const SAMPLE: Record<MomentKind, { text: string; value?: number }> = {
  "game-finished": { text: "Mai finished Gift Guess", value: 150 },
  points: { text: "Team Crane +200", value: 200 },
  "rank-change": { text: "You moved up to 3rd" },
  "lead-change": { text: "Team Dragon takes the lead!" },
  "team-created": { text: "Team Phoenix is here" },
  "big-donation": { text: "Linh gave Team Tiger 300", value: 300 },
  "judged-right": { text: "Team Crane is right", value: 400 },
  "judged-wrong": { text: "Not quite, Team Tiger" },
  "phase-change": { text: "Team round begins" },
  "photo-winner": { text: "Best ornament photo: Bao", value: 250 },
  "final-standings": { text: "Team Dragon wins the night", value: 2480 },
};

const TEAMS = ["Team Dragon", "Team Crane", "Team Tiger", "Team Phoenix"];
const start: BarRaceEntry[] = TEAMS.map((name, i) => ({
  id: `t${i}`,
  name,
  score: 1800 - i * 300,
  team: i + 1,
}));

let seq = 0;
const nextId = () => `demo-${String(++seq)}`;

function Section() {
  const { Button } = useSlots();
  const celebrate = useCelebrate();
  const [count, setCount] = useState(340);
  const [teams, setTeams] = useState(start);
  const [bursts, setBursts] = useState<string[]>([]);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-gm-display text-5xl font-bold">
          <CountUp value={count} />
        </span>
        <Button
          tone="secondary"
          onClick={() => {
            setCount((c) => c + 150);
          }}
        >
          Replay CountUp
        </Button>
        <span className="relative">
          {bursts.map((id) => (
            <PointsBurst
              key={id}
              points={50}
              onDone={() => {
                setBursts((b) => b.filter((x) => x !== id));
              }}
            />
          ))}
        </span>
        <Button
          tone="secondary"
          onClick={() => {
            setBursts((b) => [...b, nextId()]);
          }}
        >
          Replay PointsBurst
        </Button>
      </div>
      <div className="grid max-w-2xl gap-3">
        <BarRace label="Demo standings" entries={teams} />
        <Button
          tone="secondary"
          onClick={() => {
            setTeams((t) =>
              t.map((e, i) => ({
                ...e,
                score: e.score + ((i * 7 + seq++) % 4) * 250 + (i === 3 ? 900 : 0),
              })),
            );
          }}
        >
          Replay BarRace
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {MOMENT_KINDS.map((kind) => (
          <Button
            key={kind}
            onClick={() => {
              celebrate({ id: nextId(), kind, ...SAMPLE[kind] });
            }}
          >
            {`Play ${kind}`}
          </Button>
        ))}
      </div>
      <div className="grid justify-items-end">
        <ToastChainView />
      </div>
      <MomentsStage />
    </div>
  );
}

/** Replays every motion primitive and every moment in the surrounding pack (S14-AC11). */
export function MotionGallery({ title }: { title: string }) {
  const { Surface } = useSlots();
  return (
    <section aria-label={title}>
      <Surface className="grid gap-4 p-4">
        <h2 className="m-0 font-gm-display text-2xl font-bold">{title}</h2>
        <MomentsProvider surface="display">
          <Section />
        </MomentsProvider>
      </Surface>
    </section>
  );
}
