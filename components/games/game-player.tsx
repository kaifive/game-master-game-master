"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PointsIcon } from "@/components/icons/points";
import { CountUp, useReducedMotion } from "@/components/motion";
import { useDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { gamesApi, type Instructions, type PlayResponse } from "@/lib/games";
import { flyPoints } from "./fly";
import { InstructionsDialog } from "./instructions";
import { rendererFor } from "./renderers";

type Props = { gameId: string; type: string; instructions: Instructions; replayable: boolean };

type Phase =
  | { kind: "checking" }
  | { kind: "instructions" }
  | { kind: "playing"; play: PlayResponse; bestBefore: number }
  | { kind: "error"; message: string };

const COUNT_MS = 1200;
export const LEAVE_WARNING =
  "Leave the game? Your clock keeps running, so you may lose this question.";

/**
 * The run's points count up from 0; a new best then flies to the header
 * total, which counts up in turn (S08-AC11, AC15).
 */
function Result({
  play,
  bestBefore,
  summary,
  onAgain,
}: {
  play: PlayResponse;
  bestBefore: number;
  summary: string | null;
  onAgain?: (() => void) | undefined;
}) {
  const { Button } = useSlots();
  const { refreshPlays } = useDevice();
  const reduced = useReducedMotion();
  const score = useRef<HTMLParagraphElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const gain = play.best - bestBefore;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShown(play.points);
    });
    const timer = setTimeout(
      () => {
        const fly =
          gain > 0 && score.current
            ? flyPoints(score.current, `+${String(gain)}`, reduced, icon.current?.firstElementChild)
            : Promise.resolve();
        void fly.then(refreshPlays);
      },
      reduced ? 0 : COUNT_MS,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [play.points, gain, reduced, refreshPlays]);

  return (
    <section aria-label="Your score" className="grid justify-items-center gap-3 py-6 text-center">
      <p className="m-0 text-sm font-bold tracking-[0.12em] text-gm-text-muted uppercase">
        Your score
      </p>
      <span ref={icon} hidden>
        <PointsIcon />
      </span>
      <p
        ref={score}
        className="m-0 font-gm-display text-7xl font-bold text-gm-accent"
        aria-label={`${String(play.points)} points`}
      >
        <CountUp value={shown} duration={COUNT_MS} />
      </p>
      {summary && <p className="m-0 text-xl font-bold">{summary}</p>}
      {onAgain && (
        <>
          <p className="m-0 text-gm-text-muted">
            {gain > 0 ? "New best!" : `Your best: ${String(play.best)}`}
          </p>
          <Button size="lg" onClick={onAgain}>
            Play again
          </Button>
        </>
      )}
    </section>
  );
}

/** A solo game on the phone: instructions, play, result (spec 08). */
export function GamePlayer({ gameId, type, instructions, replayable }: Props) {
  const { Panel } = useSlots();
  const { slug, load, active, token, plays, setLeaveWarning } = useDevice();
  const renderer = rendererFor(type);
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const playerId = active?.id ?? null;
  const bestNow = plays[gameId]?.best ?? 0;

  const begin = useCallback(
    async (again = false) => {
      if (!playerId) return;
      setBusy(true);
      const res = await gamesApi.start(slug, gameId, await token(), playerId, again);
      setBusy(false);
      setPhase(
        res.ok
          ? {
              kind: "playing",
              play: res.data,
              bestBefore: res.data.status === "finished" ? res.data.best : bestNow,
            }
          : { kind: "error", message: res.message },
      );
    },
    [slug, gameId, token, playerId, bestNow],
  );

  // A started play resumes with no instructions; a new one waits for Start (S08-AC9).
  useEffect(() => {
    if (!playerId) return;
    const alive = { current: true };
    void (async () => {
      const res = await gamesApi.plays(slug, await token(), playerId);
      if (!alive.current) return;
      if (!res.ok) setPhase({ kind: "error", message: res.message });
      else if (res.data.plays[gameId]) await begin();
      else setPhase({ kind: "instructions" });
    })();
    return () => {
      alive.current = false;
    };
    // begin changes with the best score; only a new player or game should re-check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, gameId, token, playerId]);

  // Leaving mid-run costs time, so the footer asks first (S08-AC14).
  const inProgress = phase.kind === "playing" && phase.play.status === "playing";
  useEffect(() => {
    setLeaveWarning(inProgress ? LEAVE_WARNING : null);
    return () => {
      setLeaveWarning(null);
    };
  }, [inProgress, setLeaveWarning]);

  const move = async (m: unknown, options: { notBefore?: number } = {}) => {
    if (phase.kind !== "playing" || !playerId) return;
    setBusy(true);
    const res = await gamesApi.move(slug, gameId, await token(), {
      playerId,
      step: phase.play.step,
      move: m,
    });
    const apply = () => {
      setBusy(false);
      setPhase(
        res.ok
          ? { kind: "playing", play: res.data, bestBefore: phase.bestBefore }
          : { kind: "error", message: res.message },
      );
    };
    // A reply that came back early waits for its moment, such as the end of an answer's pause.
    const wait = (options.notBefore ?? 0) - Date.now();
    if (res.ok && wait > 0) setTimeout(apply, wait);
    else apply();
  };

  if (load.kind !== "ready" || (playerId && phase.kind === "checking"))
    return (
      <p aria-busy="true" className="m-0 text-gm-text-muted">
        Getting the game ready…
      </p>
    );

  if (!active)
    return (
      <Panel label="Join first">
        <p className="m-0 text-lg">
          Join the party to play.{" "}
          <Link href={`/${slug}`} className="font-bold text-gm-accent">
            Join now
          </Link>
        </p>
      </Panel>
    );

  return (
    <div className="grid gap-4">
      {phase.kind === "error" && (
        <p role="alert" className="m-0 font-bold text-gm-danger">
          {phase.message}
        </p>
      )}
      {phase.kind === "instructions" && (
        <InstructionsDialog instructions={instructions} busy={busy} onStart={() => void begin()} />
      )}
      {phase.kind === "playing" && renderer && phase.play.status === "finished" && (
        <Result
          key={`${String(phase.play.step)}-${String(phase.play.best)}`}
          play={phase.play}
          bestBefore={phase.bestBefore}
          summary={renderer.summary(phase.play.view)}
          onAgain={replayable ? () => void begin(true) : undefined}
        />
      )}
      {phase.kind === "playing" && renderer && phase.play.status === "playing" && (
        <renderer.Play
          view={phase.play.view}
          busy={busy}
          onMove={(m, options) => void move(m, options)}
          onTimeUp={() => void begin()}
        />
      )}
    </div>
  );
}
