"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
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
  /** Goes up each time the ⓘ by the game's name is tapped: show the instructions again. */
  howTo?: number;
};

type Phase =
  | { kind: "checking" }
  /** `again` starts a new run of a finished, replayable game on Start (S08-AC12). */
  | { kind: "instructions"; again: boolean }
  /**
   * 3-2-1 before a timed game (S08-AC18). The run starts on the server at
   * once, with its clock set to start when the count ends, so the wait for it
   * hides behind the count; `play` is its reply, `over` that the count ended.
   */
  | {
      kind: "countdown";
      endsAt: number;
      play: PlayResponse | null;
      over: boolean;
      bestBefore: number;
    }
  /** `hold`: the run just ended, but the game stays on screen for its last animation. */
  | { kind: "playing"; play: PlayResponse; bestBefore: number; hold?: boolean }
  | { kind: "error"; message: string };

/** The wall clock, read when a reply lands (outside render). */
const clockNow = () => Date.now();

/** How long the score card takes to flip up before the points fly. */
const FLIP_MS = 600;
export const LEAVE_WARNING =
  "Leave the game? Your clock keeps running, so you may lose this question.";
/** For a timed game that starts over when the player comes back (S08-AC18). */
export const RESTART_WARNING =
  "Leave the game? This run ends, and you'll start over when you come back.";
/** The 3-2-1 before a timed game. */
export const COUNTDOWN_MS = 3000;

/** 3, 2, 1, big, then the game. */
function CountdownScreen({
  endsAt,
  waiting,
  onDone,
}: {
  endsAt: number;
  waiting: boolean;
  onDone: () => void;
}) {
  const [now, setNow] = useState(clockNow);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const tick = setInterval(() => {
      const t = clockNow();
      setNow(t);
      if (t >= endsAt) {
        clearInterval(tick);
        done.current();
      }
    }, 100);
    return () => {
      clearInterval(tick);
    };
  }, [endsAt]);
  const left = Math.max(1, Math.ceil((endsAt - now) / 1000));
  return (
    <section aria-label="Get ready" className="grid justify-items-center gap-3 py-16 text-center">
      {waiting && now >= endsAt ? (
        <p aria-busy="true" className="m-0 text-gm-text-muted">
          Getting the game ready…
        </p>
      ) : (
        <>
          <p className="m-0 text-xl font-bold text-gm-text-muted">Get ready…</p>
          <p
            key={left}
            role="timer"
            aria-live="assertive"
            className="m-0 font-gm-display text-9xl font-bold text-gm-accent-ink tabular-nums motion-safe:animate-[gm-pop_300ms_ease-out_both]"
          >
            {left}
          </p>
        </>
      )}
    </section>
  );
}

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
  onBack,
}: {
  play: PlayResponse;
  bestBefore: number;
  summary: string | null;
  title: string;
  onAgain?: (() => void) | undefined;
  onBack: () => void;
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
        {/* A score the host gives later reads "???" until then (Khai, 2026-11-13). */}
        <ScoreCard
          label={`${title}, your score`}
          value={play.points}
          state={play.waiting ? "pending" : newBest ? "highlight" : "scored"}
          size="xl"
          fresh
        />
      </div>
      {summary && <p className="m-0 text-xl font-bold">{summary}</p>}
      {play.points === 0 && !play.waiting && (
        <p className="m-0 text-lg">No points this time. There&apos;s plenty more to play!</p>
      )}
      {onAgain && (
        <p className="m-0 text-lg text-gm-text-muted">
          {newBest ? "New best!" : `Your best: ${String(play.best)}`}
        </p>
      )}
      {/* The way back sits by Play again, not only in the header (Khai, 2026-11-10). */}
      <div className="flex flex-wrap justify-center gap-3">
        {onAgain && (
          <Button size="lg" onClick={onAgain}>
            Play again
          </Button>
        )}
        <Button size="lg" tone={onAgain ? "secondary" : "primary"} onClick={onBack}>
          Back to games
        </Button>
      </div>
    </section>
  );
}

/** A solo game on the phone: instructions, play, result (spec 08). */
export function GamePlayer({
  gameId,
  type,
  instructions,
  replayable,
  title = "This game",
  howTo = 0,
}: Props) {
  const { Panel, Button } = useSlots();
  const { slug, load, active, token, plays, setLeaveWarning, refreshPlays } = useDevice();
  const router = useRouter();
  const renderer = rendererFor(type);
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [busy, setBusy] = useState(false);
  // The instructions box: open on arrival, closed by tapping outside it, opened again by the ⓘ.
  const [sheet, setSheet] = useState(true);
  const [askedHowTo, setAskedHowTo] = useState(howTo);
  if (howTo !== askedHowTo) {
    setAskedHowTo(howTo);
    setSheet(true);
  }
  const playerId = active?.id ?? null;
  const bestNow = plays[gameId]?.best ?? 0;

  // The game's pictures load while the instructions are read (Khai, 2026-11-14).
  useEffect(() => {
    for (const src of instructions.preload ?? []) preload(src, { as: "image" });
  }, [instructions.preload]);

  const toPlaying = (play: PlayResponse, bestBefore: number): Phase => ({
    kind: "playing",
    play,
    bestBefore: play.status === "finished" ? play.best : bestBefore,
  });

  /** From Start: a timed game counts 3-2-1 while its run starts on the server. */
  const startFresh = async (again: boolean) => {
    if (!playerId) return;
    if (!renderer?.countdown) {
      await begin(again);
      return;
    }
    setSheet(false);
    setPhase({
      kind: "countdown",
      endsAt: clockNow() + COUNTDOWN_MS,
      play: null,
      over: false,
      bestBefore: bestNow,
    });
    const res = await gamesApi.start(slug, gameId, await token(), playerId, again, COUNTDOWN_MS);
    setPhase((p) => {
      if (p.kind !== "countdown") return p;
      if (!res.ok) return { kind: "error", message: res.message };
      return p.over ? toPlaying(res.data, p.bestBefore) : { ...p, play: res.data };
    });
  };

  const begin = useCallback(
    async (again = false) => {
      if (!playerId) return;
      setBusy(true);
      const res = await gamesApi.start(slug, gameId, await token(), playerId, again);
      setBusy(false);
      setSheet(false);
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

  // A started play resumes with no instructions; a new one, or a replay of a
  // finished one, waits on the instructions' Start (S08-AC9, Khai 2026-11-10).
  useEffect(() => {
    if (!playerId) return;
    const alive = { current: true };
    void (async () => {
      const res = await gamesApi.plays(slug, await token(), playerId);
      if (!alive.current) return;
      if (!res.ok) {
        setPhase({ kind: "error", message: res.message });
        return;
      }
      const play = res.data.plays[gameId];
      const replay = play?.status === "finished" && replayable && !play.once && !play.waiting;
      // A run left midway is forfeited: coming back starts over (S08-AC18, Khai 2026-11-15).
      // A one-chance game keeps its run, and so does any game in an event that isn't replayable.
      const restart = play?.status === "playing" && replayable && !play.once;
      if (!play || replay || restart) setPhase({ kind: "instructions", again: replay || restart });
      else await begin();
    })();
    return () => {
      alive.current = false;
    };
    // begin changes with the best score; only a new player or game should re-check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, gameId, token, playerId]);

  // A play the server returned outside a move, such as after a photo upload (spec 20).
  const showPlay = useCallback((play: PlayResponse) => {
    setPhase((p) => ({
      kind: "playing",
      play,
      bestBefore: p.kind === "playing" ? p.bestBefore : play.best,
    }));
  }, []);

  // Leaving mid-run costs time in a timed game, so the footer asks first (S08-AC14).
  const midRun = phase.kind === "playing" && phase.play.status === "playing";
  const restarts = replayable && !(phase.kind === "playing" && phase.play.once);
  const warning =
    midRun && restarts
      ? RESTART_WARNING
      : midRun && renderer?.warnOnLeave === true
        ? LEAVE_WARNING
        : null;
  useEffect(() => {
    setLeaveWarning(warning);
    return () => {
      setLeaveWarning(null);
    };
  }, [warning, setLeaveWarning]);

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
      const hold =
        res.ok && res.data.status === "finished" && renderer?.holdResultMs
          ? renderer.holdResultMs
          : 0;
      setPhase(
        res.ok
          ? { kind: "playing", play: res.data, bestBefore: phase.bestBefore, hold: hold > 0 }
          : { kind: "error", message: res.message },
      );
      if (hold > 0)
        setTimeout(() => {
          setPhase((p) => (p.kind === "playing" ? { ...p, hold: false } : p));
        }, hold);
    };
    // A reply that came back early waits for its moment, such as the end of an answer's pause.
    const wait = (options.notBefore ?? 0) - clockNow();
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
      {phase.kind === "instructions" && sheet && (
        <InstructionsDialog
          instructions={instructions}
          busy={busy}
          onStart={() => void startFresh(phase.again)}
          onClose={() => {
            setSheet(false);
          }}
        />
      )}
      {/* Closed without starting: Start is still here, and the ⓘ shows the rules again. */}
      {phase.kind === "instructions" && !sheet && (
        <div className="grid justify-items-center gap-4 py-10 text-center">
          <p className="m-0 text-lg text-gm-text-muted">Tap ⓘ by the name to see how to play.</p>
          <Button size="lg" onClick={() => void startFresh(phase.again)} disabled={busy}>
            {busy ? "Starting…" : "Start"}
          </Button>
        </div>
      )}
      {phase.kind === "countdown" && (
        <CountdownScreen
          endsAt={phase.endsAt}
          waiting={phase.play === null}
          onDone={() => {
            setPhase((p) =>
              p.kind !== "countdown"
                ? p
                : p.play
                  ? toPlaying(p.play, p.bestBefore)
                  : { ...p, over: true },
            );
          }}
        />
      )}
      {/* Opened again mid-game: a reminder, with a way back. */}
      {phase.kind === "playing" && sheet && phase.play.status === "playing" && (
        <InstructionsDialog
          instructions={instructions}
          onClose={() => {
            setSheet(false);
          }}
        />
      )}
      {phase.kind === "playing" && renderer && phase.play.status === "finished" && !phase.hold && (
        <Result
          key={`${String(phase.play.step)}-${String(phase.play.best)}`}
          play={phase.play}
          bestBefore={phase.bestBefore}
          summary={renderer.summary(phase.play.view)}
          title={title}
          onBack={() => {
            router.push(`/${slug}`);
          }}
          onAgain={
            replayable && !phase.play.once
              ? () => {
                  setSheet(true);
                  setPhase({ kind: "instructions", again: true });
                }
              : undefined
          }
        />
      )}
      {phase.kind === "playing" &&
        renderer &&
        (phase.play.status === "playing" || phase.hold === true) && (
          <renderer.Play
            view={phase.play.view}
            busy={busy}
            onMove={(m, options) => void move(m, options)}
            onTimeUp={() => void begin()}
            gameId={gameId}
            onPlay={showPlay}
          />
        )}
    </div>
  );
}
