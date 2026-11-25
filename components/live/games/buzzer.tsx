"use client";

import { useState } from "react";
import { CheckIcon, CrossIcon } from "@/components/icons/game";
import { useSlots } from "@/components/slots/registry";
import type { BuzzerHostView, BuzzerView } from "@/lib/live";
import { cx } from "@/lib/ui";
import type {
  ActiveLiveView,
  LiveControllerProps,
  LiveHostProps,
  LiveRenderer,
  LiveTvProps,
} from "../types";
import { PhoneNote, PhoneResult, PRESS_AREA, Swatch, useServerTime } from "./shared";

/**
 * The buzzer round (spec 12): the question on the TV, a red buzzer that turns
 * green when the host opens it, the buzz order for everyone, and the host's
 * panel in Controls with the answer. Red and green always come with words and
 * a mark (a lock, "BUZZ!"), so color is never the only signal.
 */

const seconds = (ms: number) => `+${(ms / 1000).toFixed(2)} s`;
const ordinal = (n: number) =>
  `${String(n)}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

function LockIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

/** The question, as big as the room needs, with its picture. */
function Question({ g, size }: { g: BuzzerView; size: "tv" | "phone" }) {
  const tv = size === "tv";
  return (
    <div className={cx("grid justify-items-center text-center", tv ? "gap-[2vh]" : "gap-2")}>
      <p
        className={cx(
          "m-0 font-bold text-gm-text-muted tabular-nums",
          tv ? "text-[clamp(1rem,2.6vh,1.9rem)]" : "text-base",
        )}
      >
        Question {g.index} of {g.of} · {g.points} points
      </p>
      <p
        className={cx(
          "m-0 font-gm-display font-bold text-balance",
          tv ? "max-w-[85vw] text-[clamp(2rem,7vh,5.5rem)] leading-tight" : "text-2xl",
        )}
      >
        {g.prompt}
      </p>
      {g.picture && (
        // A plain img: event pictures are small and come from /public.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={g.picture}
          alt=""
          className={cx("rounded-gm object-contain", tv ? "max-h-[30vh]" : "max-h-48")}
        />
      )}
    </div>
  );
}

/** The TV's bar under the question: red and locked, or green and open. */
function StateBar({ open }: { open: boolean }) {
  return (
    <p
      className={cx(
        "m-0 flex items-center justify-center gap-[0.4em] rounded-gm px-[1em] py-[0.4em] font-gm-display text-[clamp(1.8rem,6vh,4.5rem)] font-bold text-gm-bg",
        open
          ? "bg-gm-success motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)]"
          : "bg-gm-danger",
      )}
    >
      {open ? (
        "Buzz now!"
      ) : (
        <>
          <LockIcon size={44} /> Wait…
        </>
      )}
    </p>
  );
}

/** Who buzzed, in order: the team up big, the rest under it; wrong ones crossed out. */
function Order({ view, g }: { view: ActiveLiveView; g: BuzzerView }) {
  const team = (id: string) => view.teams.find((t) => t.id === id);
  const up = g.upNext ? team(g.upNext) : undefined;
  return (
    <div className="grid gap-[2.4vh]">
      {up && (
        <p className="m-0 flex items-center justify-center gap-[0.4em] font-gm-display text-[clamp(2.4rem,9vh,7rem)] leading-none font-bold motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)]">
          <Swatch color={up.color} size="0.8em" />
          {up.name}!
        </p>
      )}
      <ol
        aria-label="Buzz order"
        className="m-0 flex list-none flex-wrap justify-center gap-[1.4vh] p-0"
      >
        {g.buzzes.map((b, i) => {
          const t = team(b.teamId);
          if (!t) return null;
          return (
            <li
              key={b.teamId}
              className={cx(
                "flex items-center gap-3 rounded-gm px-4 py-[1.2vh] text-[clamp(1rem,2.8vh,2rem)] font-bold ring-1",
                b.teamId === g.upNext
                  ? "bg-gm-surface-raised ring-gm-tile-correct"
                  : "bg-gm-surface ring-gm-border",
                b.result === "wrong" && "text-gm-text-muted line-through",
              )}
            >
              <span className="font-gm-display tabular-nums">{ordinal(i + 1)}</span>
              <Swatch color={t.color} />
              <span>{t.name}</span>
              <span className="text-gm-text-muted tabular-nums no-underline">
                {seconds(b.after)}
              </span>
              {b.result === "wrong" && (
                <span className="text-gm-danger" aria-label="wrong">
                  <CrossIcon size={24} />
                </span>
              )}
              {b.result === "right" && (
                <span className="text-gm-tile-correct" aria-label="right">
                  <CheckIcon size={24} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The answer out: who got it and their points on a card, or just the answer. */
function Answer({ view, g }: { view: ActiveLiveView; g: BuzzerView }) {
  const { ScoreCard } = useSlots();
  const winner = view.teams.find((t) => t.id === g.winner);
  return (
    <div className="grid justify-items-center gap-[2.4vh] text-center">
      <p className="m-0 font-gm-display text-[clamp(1.6rem,4.5vh,3.2rem)] font-bold text-gm-text-muted">
        The answer
      </p>
      <p className="m-0 font-gm-display text-[clamp(3rem,11vh,8rem)] leading-none font-bold text-gm-tile-correct">
        {g.answer}
      </p>
      {winner ? (
        <div className="flex items-center gap-[3vh]">
          <p className="m-0 flex items-center gap-[0.4em] font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            <Swatch color={winner.color} size="0.8em" />
            {winner.name}
          </p>
          <ScoreCard
            label={`${winner.name} wins`}
            value={g.points}
            state="highlight"
            size="lg"
            fresh
          />
        </div>
      ) : (
        <p className="m-0 text-[clamp(1.2rem,3vh,2.2rem)] text-gm-text-muted">
          Nobody got it this time.
        </p>
      )}
    </div>
  );
}

function Tv({ view, game }: LiveTvProps) {
  const g = game as BuzzerView | null;
  if (!g) return null;
  if (g.answer !== null)
    return (
      <div className="grid gap-[3vh]">
        <Question g={g} size="tv" />
        <Answer view={view} g={g} />
      </div>
    );
  return (
    <div className="grid gap-[3vh]">
      <Question g={g} size="tv" />
      {g.buzzes.length > 0 ? <Order view={view} g={g} /> : <StateBar open={g.phase === "open"} />}
    </div>
  );
}

/** How long the "Too early!" lockout on this phone has left, on the shared clock. */
function lockedFor(g: BuzzerView, lastEarly: number | null, now: number) {
  const early = Math.max(g.mine?.early ?? 0, lastEarly ?? 0);
  return early > 0 ? Math.max(0, early + g.lockoutMs - now) : 0;
}

/**
 * The buzzer: one huge round button that fires on press. Red with a lock
 * until the host opens it, green and pulsing when open; a red press shakes
 * and locks it out briefly (S12-AC7). Then where the team came in.
 */
function Controller(props: LiveControllerProps) {
  const g = props.game as BuzzerView | null;
  if (!g) return null;
  if (props.revealed) return <PhoneResult view={props.view} />;
  // Each question gets a fresh buzzer.
  return <Buzzer key={g.index} {...props} g={g} />;
}

function Buzzer({ view, g, serverNow, send }: LiveControllerProps & { g: BuzzerView }) {
  const [lastEarly, setLastEarly] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const now = useServerTime(serverNow);
  const team = view.teams.find((t) => t.id === view.you?.teamId);
  if (g.mine?.place) {
    const result = g.mine.result;
    return (
      <div className="grid justify-items-center gap-4 py-4 text-center">
        <div
          className={cx(
            PRESS_AREA,
            "h-[max(40dvh,14rem)] border-[14px] bg-gm-tile-present text-8xl text-gm-tile-present-ink",
          )}
          style={{ borderColor: team ? `var(--gm-team-${String(team.color)})` : undefined }}
        >
          {ordinal(g.mine.place)}
        </div>
        <p className="m-0 font-gm-display text-3xl font-bold">
          {result === "right"
            ? "Right! The points are yours."
            : result === "wrong"
              ? "Not this time."
              : g.mine.place === 1
                ? "You're 1st! Answer out loud."
                : `You're ${ordinal(g.mine.place)}!`}
        </p>
      </div>
    );
  }
  if (g.answer !== null) return <PhoneNote title="Look at the TV!">The answer is up.</PhoneNote>;
  const open = g.phase === "open";
  const locked = lockedFor(g, lastEarly, now) > 0;
  const live = open && !locked && pressed === null;
  const press = () => {
    const at = Math.round(serverNow());
    if ("vibrate" in navigator) navigator.vibrate(open ? 40 : [20, 30, 20]);
    if (!open) {
      // A red press: a short lockout, here and on the server (S12-AC7).
      setLastEarly(at);
      setShake((n) => n + 1);
    } else if (locked || pressed !== null) {
      return;
    } else setPressed(at);
    void send({ at });
  };
  return (
    <div className="grid gap-4 py-2">
      <button
        type="button"
        key={shake}
        aria-label={live ? "Buzz" : open ? "Too early, wait a moment" : "Wait for green"}
        onPointerDown={(e) => {
          e.preventDefault();
          press();
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            press();
          }
        }}
        className={cx(
          PRESS_AREA,
          "text-gm-bg",
          live
            ? "bg-gm-success text-8xl motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)] motion-safe:active:scale-[0.99]"
            : "bg-gm-danger text-5xl",
          shake > 0 &&
            !open &&
            "motion-safe:animate-[gm-shake_var(--gm-motion-base)_var(--gm-ease-out)]",
        )}
      >
        {live ? (
          "BUZZ!"
        ) : pressed !== null ? (
          "Sent!"
        ) : (
          <span className="grid justify-items-center gap-2">
            <LockIcon size={72} />
            {locked || (lastEarly !== null && !open) ? "Too early!" : "Wait…"}
          </span>
        )}
      </button>
      <p className="m-0 text-center text-lg text-gm-text-muted">
        {live ? "Buzz now! First in answers out loud." : "Wait for green!"}
      </p>
    </div>
  );
}

/** The host's panel in Controls: the question with its answer, the order, and the judging (S12-AC1 to AC5). */
function Host({ view, host, act, busy }: LiveHostProps) {
  const h = host as BuzzerHostView | null;
  if (!h) return null;
  const team = (id: string) => view.teams.find((t) => t.id === id);
  const btn =
    "min-h-11 rounded-gm px-4 font-bold ring-1 ring-gm-border disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <section aria-label="Buzzer" className="grid gap-3">
      <div className="grid gap-1">
        <p className="m-0 text-sm font-bold text-gm-text-muted">
          Question {h.index} of {h.of} · {h.points} points
        </p>
        <p className="m-0 text-lg font-bold">{h.prompt}</p>
        <p className="m-0 rounded-gm bg-gm-surface-raised px-3 py-2">
          <span className="text-sm font-bold text-gm-text-muted">Answer: </span>
          <strong>{h.answer}</strong>
        </p>
      </div>
      {h.phase === "shown" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            act({ action: "host", act: "open" });
          }}
          className={cx(btn, "min-h-14 bg-gm-success text-xl text-gm-bg")}
        >
          Open buzzers
        </button>
      )}
      {h.phase === "open" && h.buzzes.length === 0 && (
        <p className="m-0 font-bold text-gm-success" aria-live="polite">
          Buzzers open. Waiting for a buzz…
        </p>
      )}
      {h.buzzes.length > 0 && (
        <ol aria-label="Buzz order" className="m-0 grid list-none gap-2 p-0">
          {h.buzzes.map((b, i) => {
            const t = team(b.teamId);
            const up = b.teamId === h.upNext;
            return (
              <li
                key={b.teamId}
                className={cx(
                  "grid gap-2 rounded-gm border px-3 py-2",
                  up ? "border-gm-success bg-gm-surface-raised" : "border-gm-border",
                )}
              >
                <span className="flex items-center gap-2 font-bold">
                  <span className="tabular-nums">{ordinal(i + 1)}</span>
                  {t && <Swatch color={t.color} />}
                  <span
                    className={cx(
                      "min-w-0 flex-1 truncate",
                      b.result === "wrong" && "line-through",
                    )}
                  >
                    {t?.name ?? b.teamId}
                  </span>
                  <span className="text-sm text-gm-text-muted tabular-nums">
                    {seconds(b.after)}
                  </span>
                  {b.result && (
                    <span className="text-sm">{b.result === "right" ? "Right" : "Wrong"}</span>
                  )}
                </span>
                {up && (
                  <span className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        act({ action: "host", act: { act: "right", team: b.teamId } });
                      }}
                      className={cx(btn, "min-h-12 bg-gm-success text-gm-bg")}
                    >
                      Right
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        act({ action: "host", act: { act: "wrong", team: b.teamId } });
                      }}
                      className={cx(btn, "min-h-12 bg-gm-danger text-gm-bg")}
                    >
                      Wrong
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        {h.canReopen && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              act({ action: "host", act: "reopen" });
            }}
            className={btn}
          >
            Reopen buzzers
          </button>
        )}
        {h.answer && h.phase !== "done" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              act({ action: "host", act: "reveal" });
            }}
            className={btn}
          >
            Reveal the answer
          </button>
        )}
        {h.canUndo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              act({ action: "host", act: "undo" });
            }}
            className={btn}
          >
            Undo
          </button>
        )}
      </div>
    </section>
  );
}

/** Red and locked, then green: BUZZ! (S24-AC4). */
function Demo() {
  const look =
    "grid aspect-[3/4] w-[34%] place-items-center rounded-gm font-gm-display text-[clamp(1.2rem,3.6vh,2.6rem)] font-bold text-gm-bg shadow-xl";
  // Sized by the demo screen, so both buttons fit it whatever the TV (layout sweep, 2026-11-25).
  return (
    <div className="flex h-full w-full items-center justify-center gap-[5%] px-[6%]">
      <div className={cx(look, "bg-gm-danger")}>
        <span className="grid justify-items-center gap-2">
          <LockIcon size={36} />
          Wait…
        </span>
      </div>
      <span
        aria-hidden="true"
        className="font-gm-display text-[clamp(2rem,7vh,5rem)] text-gm-text-muted"
      >
        →
      </span>
      <div className={cx(look, "bg-gm-success")}>BUZZ!</div>
    </div>
  );
}

export const buzzerRenderer: LiveRenderer = { Tv, Controller, Demo, Host };
