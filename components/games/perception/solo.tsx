"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TimeLeft } from "@/components/live/games/shared";
import { useFrame } from "@/components/live/use-live";
import { useSlots } from "@/components/slots/registry";
import { FEEDBACK_MS, percent, type PerceptionSoloView } from "@/lib/games";
import type { GameRenderer, GameRendererProps } from "../types";
import { PerceptionStage } from "./stage";

/**
 * A perception game solo on the phone (spec 28, S28-AC2): three tasks, each
 * shown and then answered, with how close each answer was held up on a
 * score card in between.
 */

/** The last answer, held up: how close as a score card, and what it was. */
function HowClose({ last }: { last: NonNullable<PerceptionSoloView["last"]> }) {
  const { ScoreCard } = useSlots();
  return (
    <section aria-label="How close" className="grid justify-items-center gap-3 py-6 text-center">
      <ScoreCard
        label="How close, out of 100"
        value={Math.round(last.closeness * 100)}
        state={last.closeness > 0 ? "scored" : "blank"}
        size="lg"
        fresh
      />
      <p className="m-0 font-gm-display text-3xl font-bold">{percent(last.closeness)}</p>
      <p className="m-0 text-lg text-gm-text-muted">
        {last.said === null ? "No answer in time." : `You said ${last.said}.`} It was {last.truth}.
      </p>
    </section>
  );
}

/** One view from the server, run on this phone's clock from the moment it came. */
function Task({
  view,
  onMove,
  onTimeUp,
  busy,
  type,
}: GameRendererProps & { type: string; view: PerceptionSoloView }) {
  const [anchor] = useState(() => performance.now() - view.elapsed);
  const clock = useCallback(() => performance.now() - anchor, [anchor]);
  useFrame(!view.done);
  const elapsed = clock();
  const end = view.showMs + view.answerMs;
  const asked = useRef(false);
  const [answered, setAnswered] = useState(false);
  // The next task's scene, or the timed-out view, comes from the server.
  const due =
    !view.done && !answered && (view.phase === "between" ? elapsed >= 0 : elapsed > end + 150);
  useEffect(() => {
    if (!due || asked.current) return;
    asked.current = true;
    onTimeUp();
  }, [due, onTimeUp]);
  const onAnswer = useCallback(
    (answer: unknown) => {
      if (answered) return;
      setAnswered(true);
      onMove({ answer });
    },
    [onMove, answered],
  );
  if (view.phase === "between" || view.done)
    return view.last ? <HowClose last={view.last} /> : null;
  if (elapsed > end)
    return (
      <p className="m-0 py-6 text-center font-gm-display text-3xl font-bold">Time&apos;s up!</p>
    );
  return (
    <PerceptionStage
      type={type}
      scene={view.scene}
      elapsed={elapsed}
      clock={clock}
      showMs={view.showMs}
      answerMs={view.answerMs}
      busy={busy}
      onAnswer={onAnswer}
      showOn="phone"
      timer={<TimeLeft closesAt={end} now={elapsed} total={view.answerMs} />}
    />
  );
}

function soloPlay(type: string) {
  return function PerceptionGame(props: GameRendererProps) {
    const view = props.view as PerceptionSoloView;
    return (
      <section aria-label="Perception game" className="grid gap-3">
        <p className="m-0 text-base font-bold text-gm-text-muted">
          Round {Math.min(view.task, view.of)} of {view.of}
        </p>
        <Task
          key={`${String(view.task)}:${view.phase}:${String(view.elapsed)}`}
          {...props}
          view={view}
          type={type}
        />
      </section>
    );
  };
}

export function perceptionSummary(raw: unknown): string | null {
  const view = raw as PerceptionSoloView;
  if (!view.done || view.closeness.length === 0) return null;
  const avg = view.closeness.reduce((a, b) => a + b, 0) / view.closeness.length;
  return `${percent(avg)} on average`;
}

/** The solo renderer for each perception game. */
export const perceptionRenderer = (type: string): GameRenderer => ({
  Play: soloPlay(type),
  summary: perceptionSummary,
  holdResultMs: FEEDBACK_MS,
  countdown: true,
});
