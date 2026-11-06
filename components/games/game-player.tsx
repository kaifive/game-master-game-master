"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CountUp } from "@/components/motion";
import { useDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { gamesApi, type Instructions, type PlayResponse } from "@/lib/games";
import { InstructionsDialog } from "./instructions";
import { rendererFor } from "./renderers";

type Props = { gameId: string; type: string; instructions: Instructions };

type Phase =
  | { kind: "checking" }
  | { kind: "instructions" }
  | { kind: "playing"; play: PlayResponse }
  | { kind: "error"; message: string };

/** The points count up from 0 to the final score (S08-AC11). */
function Result({
  points,
  summary,
  slug,
}: {
  points: number;
  summary: string | null;
  slug: string;
}) {
  const [shown, setShown] = useState(0);
  // Start at 0, then let CountUp run to the score.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShown(points);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [points]);
  return (
    <section aria-label="Your score" className="grid justify-items-center gap-3 py-6 text-center">
      <p className="m-0 text-sm font-bold tracking-[0.12em] text-gm-text-muted uppercase">
        Your score
      </p>
      <p
        className="m-0 font-gm-display text-7xl font-bold text-gm-accent"
        aria-label={`${String(points)} points`}
      >
        <CountUp value={shown} duration={1200} />
      </p>
      {summary && <p className="m-0 text-xl font-bold">{summary}</p>}
      <Link href={`/${slug}`} className="font-bold text-gm-accent">
        Back to all games
      </Link>
    </section>
  );
}

/** A solo game on the phone: instructions, play, result (spec 08). Needs a DeviceProvider. */
export function GamePlayer({ gameId, type, instructions }: Props) {
  const { Panel } = useSlots();
  const { slug, load, active, token } = useDevice();
  const renderer = rendererFor(type);
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  const playerId = active?.id ?? null;

  const begin = useCallback(async () => {
    if (!playerId) return;
    setBusy(true);
    const res = await gamesApi.start(slug, gameId, await token(), playerId);
    setBusy(false);
    setPhase(
      res.ok ? { kind: "playing", play: res.data } : { kind: "error", message: res.message },
    );
  }, [slug, gameId, token, playerId]);

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
  }, [slug, gameId, token, playerId, begin]);

  const move = async (m: unknown) => {
    if (phase.kind !== "playing" || !playerId) return;
    setBusy(true);
    const res = await gamesApi.move(slug, gameId, await token(), {
      playerId,
      step: phase.play.step,
      move: m,
    });
    setBusy(false);
    setPhase(
      res.ok ? { kind: "playing", play: res.data } : { kind: "error", message: res.message },
    );
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
      <p className="m-0 text-gm-text-muted">
        Playing as <strong className="text-gm-text">{active.nickname}</strong>
      </p>
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
          points={phase.play.points}
          summary={renderer.summary(phase.play.view)}
          slug={slug}
        />
      )}
      {phase.kind === "playing" && renderer && phase.play.status === "playing" && (
        <renderer.Play
          view={phase.play.view}
          busy={busy}
          onMove={(m) => void move(m)}
          onTimeUp={() => void begin()}
        />
      )}
    </div>
  );
}
