"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readAnswerKey, type ChoiceView, type Media, type TriviaView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

type Asked = Extract<TriviaView, { kind: "question" | "answered" }>;

const Picture = ({ image, className }: { image: Media; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element -- event images are small and may be remote; no optimizer needed
  <img
    src={image.src}
    alt={image.alt}
    className={cx("block h-auto max-w-full rounded-gm", className)}
  />
);

/** Counts down locally from the server's msLeft, and says when time is up. */
function useCountdown(msLeft: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(msLeft);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + msLeft;
    const timer = setInterval(() => {
      const next = Math.max(0, end - Date.now());
      setLeft(next);
      if (next === 0) {
        clearInterval(timer);
        done.current();
      }
    }, 200);
    return () => {
      clearInterval(timer);
    };
  }, [msLeft, running]);
  return running ? left : msLeft;
}

function choiceTone(view: Asked, i: number, picked: number | null) {
  if (view.kind !== "answered") {
    // While the server checks it, the tapped answer lights up and the rest step back (S10-AC13).
    if (picked === null) return "bg-gm-surface-raised text-gm-text ring-gm-border";
    return i === picked
      ? "bg-gm-surface-raised text-gm-text ring-4 ring-gm-accent scale-[1.03]"
      : "bg-gm-surface text-gm-text-muted ring-gm-border opacity-60";
  }
  if (i === view.correct) return "bg-gm-tile-correct text-gm-tile-correct-ink ring-gm-tile-correct";
  if (i === view.chosen) return "bg-gm-danger text-white ring-gm-danger";
  return "bg-gm-surface text-gm-text-muted ring-gm-border opacity-70";
}

function ChoiceButton({
  picked,
  choice,
  index,
  view,
  onPick,
  disabled,
}: {
  choice: ChoiceView;
  index: number;
  view: Asked;
  onPick: (i: number) => void;
  disabled: boolean;
  picked: number | null;
}) {
  const mark =
    view.kind === "answered"
      ? index === view.correct
        ? "Right answer"
        : index === view.chosen
          ? "Your answer"
          : null
      : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onPick(index);
      }}
      aria-label={mark ? `${choice.text ?? choice.image?.alt ?? ""} (${mark})` : undefined}
      className={cx(
        "grid min-h-20 w-full touch-manipulation place-items-center gap-2 rounded-gm p-4 text-center font-gm-display text-2xl font-bold ring-2 transition-[background-color,box-shadow,opacity,transform] duration-100 select-none active:scale-[0.97] disabled:cursor-default [&_*]:pointer-events-none",
        choiceTone(view, index, picked),
      )}
    >
      {choice.image && <Picture image={choice.image} className="max-h-28" />}
      {(choice.text ?? mark) && (
        <span>
          {mark && (
            <span aria-hidden="true" className="mr-2">
              {mark === "Right answer" ? "✓" : "✗"}
            </span>
          )}
          {choice.text}
        </span>
      )}
    </button>
  );
}

/** Seconds left as a draining bar, plus the number for anyone who can't see the bar. */
function TimerBar({ left, seconds }: { left: number; seconds: number }) {
  const secs = Math.ceil(left / 1000);
  const share = Math.max(0, Math.min(1, left / (seconds * 1000)));
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label="Time left"
        aria-valuemin={0}
        aria-valuemax={seconds}
        aria-valuenow={secs}
        className="h-3 flex-1 overflow-hidden rounded-full bg-gm-surface-raised"
      >
        <div
          className={cx("h-full rounded-full", secs <= 5 ? "bg-gm-danger" : "bg-gm-accent")}
          style={{ width: `${String(share * 100)}%` }}
        />
      </div>
      <span className="w-10 text-right font-gm-display text-xl font-bold tabular-nums">
        {secs}s
      </span>
    </div>
  );
}

/** How long the answer shows before the next question comes on its own (S10-AC10). */
export const REVEAL_MS = 1000;

/**
 * Moves on once per question, REVEAL_MS after the answer shows. No tap to
 * skip, so a stray tap can't land on the next question. The wait runs on the
 * phone, so a phone that leaves waits here (S10-AC10).
 */
function useAdvance(answered: boolean, question: number, next: () => void) {
  const sent = useRef<number | null>(null);
  const latest = useRef(next);
  useEffect(() => {
    latest.current = next;
  }, [next]);
  const advance = useCallback(() => {
    if (sent.current === question) return;
    sent.current = question;
    latest.current();
  }, [question]);
  useEffect(() => {
    if (!answered) return;
    const timer = setTimeout(advance, REVEAL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [answered, advance]);
  return advance;
}

/** The tapped answer marked right or wrong from the question's key, before the server replies. */
function judgedLocally(view: Asked, picked: number): Asked {
  if (view.kind !== "question") return view;
  const correct = readAnswerKey(view.key, view.number, view.choices.length);
  if (correct === null) return view;
  return { ...view, kind: "answered", chosen: picked, correct, right: picked === correct };
}

const FEEDBACK = { right: "Right!", wrong: "Not quite.", late: "Time's up." };

/** Trivia on the phone (spec 10): question, answers in a grid or list, a timer, then feedback. */
export function TriviaGame({ view: raw, onMove, onTimeUp, busy }: GameRendererProps) {
  const serverView = raw as Asked;
  const asking = serverView.kind === "question";
  // The answer tapped on this question. With the question's answer key, the phone
  // says right or wrong at once; the server's reply then confirms it (S10-AC13, ADR-029).
  const [pick, setPicked] = useState<{ question: number; choice: number } | null>(null);
  const picked = asking && pick?.question === serverView.number ? pick.choice : null;
  const view = picked === null ? serverView : judgedLocally(serverView, picked);
  const left = useCountdown(serverView.msLeft, asking && picked === null, onTimeUp);
  // The next question waits for the server's reply, so its step is always current.
  useAdvance(serverView.kind === "answered", serverView.number, () => {
    onMove({ type: "next" });
  });
  const feedback =
    view.kind === "answered"
      ? view.right
        ? FEEDBACK.right
        : view.chosen === null
          ? FEEDBACK.late
          : FEEDBACK.wrong
      : null;

  return (
    <section aria-label="Trivia" className="grid gap-4">
      <div className="grid gap-2">
        <p className="m-0 text-sm font-bold tracking-wide text-gm-text-muted uppercase">
          Question {view.number} of {view.total}
        </p>
        <TimerBar left={left} seconds={view.seconds} />
      </div>
      <h2 className="m-0 font-gm-display text-2xl font-bold">{view.prompt}</h2>
      {view.image && <Picture image={view.image} className="mx-auto max-h-56" />}
      <ul
        aria-label="Answers"
        className={cx(
          "m-0 list-none gap-3 p-0",
          view.layout === "grid" ? "grid grid-cols-2" : "grid",
        )}
      >
        {view.choices.map((choice, i) => (
          <li key={i} className="flex">
            <ChoiceButton
              choice={choice}
              index={i}
              view={view}
              picked={picked}
              disabled={!asking || busy || picked !== null}
              onPick={(choiceIndex) => {
                setPicked({ question: view.number, choice: choiceIndex });
                onMove({ type: "answer", choice: choiceIndex });
              }}
            />
          </li>
        ))}
      </ul>
      {feedback && (
        <div className="grid justify-items-center gap-2">
          <p role="status" className="m-0 text-center text-lg font-bold">
            {feedback}
          </p>
          {/* Says what happens next, with a bar that empties over the pause (S10-AC11). */}
          <p className="m-0 text-sm text-gm-text-muted">
            {view.number === view.total
              ? "Your score is next…"
              : `Question ${String(view.number + 1)} of ${String(view.total)} is next…`}
          </p>
          <div
            aria-hidden="true"
            className="h-1 w-24 overflow-hidden rounded-full bg-gm-surface-raised"
          >
            <div
              className="h-full origin-left bg-gm-accent motion-safe:animate-[gm-drain_var(--gm-reveal)_linear_forwards]"
              style={{ "--gm-reveal": `${String(REVEAL_MS)}ms` } as React.CSSProperties}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/** "4 of 5 right" for the result screen. */
export function triviaSummary(view: unknown): string | null {
  const v = view as TriviaView;
  if (v.kind !== "done") return null;
  const right = `${String(v.right)} of ${String(v.total)} right`;
  return v.avgSeconds === null ? right : `${right} · ${String(v.avgSeconds)} s average`;
}
