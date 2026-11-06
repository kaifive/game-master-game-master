"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { ChoiceView, Media, TriviaView } from "@/lib/games";
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

function choiceTone(view: Asked, i: number) {
  if (view.kind !== "answered") return "bg-gm-surface-raised text-gm-text ring-gm-border";
  if (i === view.correct) return "bg-gm-tile-correct text-gm-tile-correct-ink ring-gm-tile-correct";
  if (i === view.chosen) return "bg-gm-danger text-white ring-gm-danger";
  return "bg-gm-surface text-gm-text-muted ring-gm-border opacity-70";
}

function ChoiceButton({
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
        "grid min-h-14 w-full place-items-center gap-2 rounded-gm p-3 text-center font-gm-display text-xl font-bold ring-2 transition-colors disabled:cursor-default",
        choiceTone(view, index),
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

const FEEDBACK = { right: "Right!", wrong: "Not quite.", late: "Time's up." };

/** Trivia on the phone (spec 10): question, answers in a grid or list, a timer, then feedback. */
export function TriviaGame({ view: raw, onMove, onTimeUp, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as Asked;
  const asking = view.kind === "question";
  const left = useCountdown(view.msLeft, asking, onTimeUp);
  const last = view.number === view.total;
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
              disabled={!asking || busy}
              onPick={(choiceIndex) => {
                onMove({ type: "answer", choice: choiceIndex });
              }}
            />
          </li>
        ))}
      </ul>
      {feedback && (
        <div className="grid gap-3">
          <p role="status" className="m-0 text-center font-gm-display text-2xl font-bold">
            {feedback}
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              onMove({ type: "next" });
            }}
          >
            {last ? "See score" : "Next"}
          </Button>
        </div>
      )}
    </section>
  );
}

/** "4 of 5 right" for the result screen. */
export function triviaSummary(view: unknown): string | null {
  const v = view as TriviaView;
  return v.kind === "done" ? `${String(v.right)} of ${String(v.total)} right` : null;
}
