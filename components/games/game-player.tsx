"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PointsIcon } from "@/components/icons/points";
import { useReducedMotion } from "@/components/motion";
import { useDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { gamesApi, type Instructions, type PlayResponse } from "@/lib/games";
import { flyPoints } from "./fly";
import { InstructionsDialog } from "./instructions";
import { rendererFor } from "./renderers";

type Props = {
  gameId: string;
  type: string;
  instructions: Instructions;
  replayable: boolean;
  /** The game's name, for the result card. */
  title?: string;
};

type Phase =
  | { kind: "checking" }
  | { kind: "instructions" }
  | { kind: "playing"; play: PlayResponse; bestBefore: number }
  | { kind: "error"; message: string };

/** How long the score card takes to flip up before the points fly. */
const FLIP_MS = 600;
export const LEAVE_WARNING =
  "Leave the game? Your clock keeps running, so you may lose this question.";

/**
 * The judges hold up the run's score card: it flips up on its handle, and a
 * new best then flies to the header total, which counts up (S08-AC11, AC15).
 */
function Result({
  play,
  bestBefore,
  summary,
  title,
  onAgain,
}: {
  play: PlayResponse;
  bestBefore: number;
  summary: string | null;
  title: string;
  onAgain?: (() => void) | undefined;
}) {
  const { Button, ScoreCard } = useSlots();
  const { refreshPlays } = useDevice();
  const reduced = useReducedMotion();
  const score = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const gain = play.best - bestBefore;
  const newBest = gain > 0 && bestBefore > 0;

  useEffect(() => {
    // The flight leaves once the card has landed.
    const timer = setTimeout(
      () => {
        const fly =
          gain > 0 && score.current
            ? flyPoints(score.current, `+${String(gain)}`, reduced, icon.current?.firstElementChild)
            : Promise.resolve();
        void fly.then(refreshPlays);
      },
      reduced ? 0 : FLIP_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [gain, reduced, refreshPlays]);

  return (
    <section aria-label="Your score" className="grid justify-items-center gap-4 py-6 text-center">
      <span ref={icon} hidden>
        <PointsIcon />
      </span>
      <div ref={score}>
        <ScoreCard
          label={`${title}, your score`}
          value={play.points}
          state={newBest ? "highlight" : "scored"}
          size="xl"
          fresh
        />
      </div>
      {summary && <p className="m-0 text-xl font-bold">{summary}</p>}
      {play.points === 0 && (
        <p className="m-0 text-lg">No points this time. There&apos;s plenty more to play!</p>
      )}
      {onAgain && (
        <p className="m-0 text-lg text-gm-text-muted">
          {newBest ? "New best!" : `Your best: ${String(play.best)}`}
        </p>
      )}
      {onAgain && (
        <Button size="lg" onClick={onAgain}>
          Play again
        </Button>
      )}
    </section>
  );
}

/** A solo game on the phone: instructions, play, result (spec 08). */
export function GamePlayer({ gameId, type, instructions, replayable, title = "This game" }: Props) {
  const { Panel } = useSlots();
  const { slug, load, active, token, plays, setLeaveWarning, refreshPlays } = useDevice();
  const router = useRouter();
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

  // Leaving mid-run costs time in a timed game, so the footer asks first (S08-AC14).
  const inProgress =
    renderer?.warnOnLeave === true && phase.kind === "playing" && phase.play.status === "playing";
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
    // A game that banks points mid-run (Geocache) updates the header total at once.
    if (res.ok && res.data.status === "playing" && res.data.best > phase.play.best)
      void refreshPlays();
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
          <Link href={`/${slug}`} className="font-bold text-gm-accent-ink">
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
        <InstructionsDialog
          instructions={instructions}
          busy={busy}
          onStart={() => void begin()}
          onLeave={() => {
            router.push(`/${slug}`);
          }}
        />
      )}
      {phase.kind === "playing" && renderer && phase.play.status === "finished" && (
        <Result
          key={`${String(phase.play.step)}-${String(phase.play.best)}`}
          play={phase.play}
          bestBefore={phase.bestBefore}
          summary={renderer.summary(phase.play.view)}
          title={title}
          onAgain={replayable && !phase.play.once ? () => void begin(true) : undefined}
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
