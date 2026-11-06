"use client";

import "@fontsource/oswald/500.css";
import "@fontsource/oswald/700.css";
import "./judges-table.css";
import { fireConfetti } from "@/components/motion/confetti";
import { TileMark, keyName, tileName, useCelebrationTimer } from "@/components/slots/defaults";
import { useTheme } from "@/components/theme";
import type { MomentKind } from "@/lib/motion";
import type {
  BannerProps,
  CelebrationProps,
  KeyProps,
  LeaderboardRowProps,
  ProgressProps,
  ScoreCardProps,
  SlotComponents,
  SurfaceProps,
  TileProps,
  ToastProps,
} from "@/lib/themes";
import { cx, variants } from "@/lib/ui";

const fmt = (n: number) => n.toLocaleString("en-US");
const useDecoration = (decoration: string) => useTheme()?.decorations.includes(decoration) ?? false;

function Surface({ children, className }: SurfaceProps) {
  const snow = useDecoration("snow");
  return (
    <div
      data-slot="surface"
      data-decoration={snow ? "snow" : undefined}
      className={cx("text-gm-text", snow ? "jt-snow" : "bg-gm-bg", className)}
    >
      {children}
    </div>
  );
}

function Holly() {
  return (
    <svg
      data-decoration="holly"
      aria-hidden="true"
      viewBox="0 0 46 32"
      className="h-8 w-11 shrink-0"
    >
      <path
        d="M22 18c-4-9-13-12-20-10 3 2 2 5 5 6-2 2-1 5 2 6 1-3 5-4 7-2 1-3 4-2 6 0z"
        fill="#2b7a57"
      />
      <path
        d="M24 18c4-9 13-12 20-10-3 2-2 5-5 6 2 2 1 5-2 6-1-3-5-4-7-2-1-3-4-2-6 0z"
        fill="#22684a"
      />
      <circle cx="20" cy="21" r="3.6" fill="#e5354f" />
      <circle cx="26.5" cy="21.5" r="3.6" fill="#c81f3a" />
      <circle cx="23.2" cy="26" r="3.6" fill="#e5354f" />
    </svg>
  );
}

function Banner({ title, subtitle, live, level = 1, aside }: BannerProps) {
  const H = level === 1 ? "h1" : "h2";
  const holly = useDecoration("holly");
  return (
    <header
      data-slot="banner"
      className="jt-band flex items-center gap-3 bg-[var(--gm-band)] px-4 pt-3 pb-4 text-[var(--gm-band-ink)]"
    >
      <div className="min-w-0">
        <H className="m-0 font-gm-display text-base font-medium tracking-[0.1em] uppercase">
          {title}
        </H>
        {subtitle && <p className="m-0 text-xs font-bold opacity-90">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {holly && <Holly />}
        {live && (
          <span className="rounded-full bg-[var(--gm-band-ink)] px-3 py-0.5 text-xs font-bold tracking-widest text-[var(--gm-band)]">
            LIVE
          </span>
        )}
        {aside}
      </div>
    </header>
  );
}

const paddle = variants({
  base: "grid place-items-center rounded-[4px] font-gm-display font-bold leading-none tabular-nums",
  variants: {
    state: {
      scored: "jt-card-shadow bg-[var(--gm-card)] text-[var(--gm-card-ink)]",
      highlight: "bg-[var(--gm-gold)] text-[#1d1300] shadow-md",
      blank: "bg-[var(--gm-card-back)] text-[var(--gm-card-back-ink)]",
    },
    size: { sm: "h-9 w-12 text-lg", md: "h-14 w-[4.5rem] text-3xl", lg: "h-24 w-32 text-5xl" },
  },
  defaults: { state: "scored", size: "md" },
});

/** A judge's score card on a handle; flips up when a score lands. */
function ScoreCard({ label, value, state, size = "md" }: ScoreCardProps) {
  const scored = state !== "blank" && value !== undefined;
  return (
    <span
      role="img"
      aria-label={scored ? `${label}: ${fmt(value)} points` : `${label}: not scored yet`}
      data-slot="score-card"
      data-state={state}
      className="inline-grid justify-items-center"
    >
      <span
        aria-hidden="true"
        className={cx(
          paddle({ state, size }),
          scored && "motion-safe:animate-[jt-flip_420ms_cubic-bezier(0.16,1,0.3,1)]",
        )}
      >
        {scored ? fmt(value) : "?"}
      </span>
      <span
        data-part="handle"
        aria-hidden="true"
        className={cx(
          "rounded-b-[2px]",
          size === "sm" ? "h-2.5 w-1.5" : "h-5 w-2",
          scored ? "jt-handle" : "bg-[var(--gm-card-back)]",
        )}
      />
    </span>
  );
}

const tileLook = variants({
  base: "relative grid size-11 place-items-center rounded-[5px] font-gm-display text-2xl font-bold uppercase",
  variants: {
    state: {
      empty: "shadow-[inset_0_0_0_1.5px_var(--gm-border)]",
      typed: "bg-[var(--gm-card)] text-[var(--gm-card-ink)] shadow-[0_0_0_2px_var(--gm-text)]",
      correct: "bg-gm-tile-correct text-gm-tile-correct-ink shadow-md",
      present: "jt-card-shadow bg-gm-tile-present text-gm-tile-present-ink",
      absent: "bg-gm-tile-absent text-gm-tile-absent-ink",
    },
  },
  defaults: { state: "empty" },
});

/** Letters as score cards: gold with a check, a red corner flag, or frosted over. */
function Tile({ letter, state }: TileProps) {
  return (
    <span
      role="img"
      aria-label={tileName(letter, state)}
      data-slot="tile"
      data-state={state}
      className={tileLook({ state })}
    >
      <span aria-hidden="true">{state === "empty" ? "" : letter}</span>
      {state === "present" ? (
        <span
          data-mark="flag"
          aria-hidden="true"
          className="absolute top-0 right-0 size-0 border-t-[14px] border-l-[14px] border-t-gm-accent border-l-transparent"
        />
      ) : (
        <TileMark state={state} />
      )}
    </span>
  );
}

const keyLook = variants({
  base: "grid h-10 place-items-center rounded-[5px] font-gm-display text-sm font-medium",
  variants: {
    state: {
      unused: "jt-card-shadow bg-[var(--gm-card)] text-[var(--gm-card-ink)]",
      correct: "bg-gm-tile-correct text-gm-tile-correct-ink",
      present:
        "jt-card-shadow bg-[var(--gm-card)] text-[var(--gm-card-ink)] shadow-[inset_0_-4px_0_var(--gm-accent)]",
      absent: "bg-gm-tile-absent text-gm-tile-absent-ink",
    },
    width: { normal: "w-[23px]", wide: "w-11 font-gm-body text-[11px] font-bold" },
  },
  defaults: { state: "unused", width: "normal" },
});

function Key({ label, state = "unused", wide, onPress }: KeyProps) {
  return (
    <button
      type="button"
      aria-label={keyName(label, state)}
      data-slot="key"
      data-state={state}
      onClick={() => {
        onPress(label);
      }}
      className={keyLook({ state, width: wide ? "wide" : "normal" })}
    >
      {label}
    </button>
  );
}

const PIP_LIMIT = 16;

/** Pips for up to 16 games, then a bar, so it works at any count. */
function Progress({ done, total, label }: ProgressProps) {
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-[13px] font-bold text-gm-text-muted">
        <span>{`${done} of ${total}`}</span>
        <span>{total - done > 0 ? `${total - done} to go` : "All scored"}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        {total <= PIP_LIMIT ? (
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, 1fr)` }}
          >
            {Array.from({ length: total }, (_, i) => (
              <i
                key={i}
                className={cx(
                  "h-2 rounded-[2px]",
                  i < done ? "bg-[var(--gm-gold-line)]" : "bg-[var(--gm-card-back)]",
                )}
              />
            ))}
          </div>
        ) : (
          <div className="h-2 overflow-hidden rounded-[2px] bg-[var(--gm-card-back)]">
            <div
              className="h-full bg-[var(--gm-gold-line)]"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ text, value }: ToastProps) {
  return (
    <div
      data-slot="toast"
      className="jt-card-shadow flex items-center gap-2 rounded-lg bg-gm-surface py-1.5 pr-3 pl-1.5 text-sm font-bold"
    >
      {value !== undefined && (
        <span className="grid h-8 min-w-11 place-items-center rounded-[4px] bg-[var(--gm-gold)] px-1 font-gm-display text-lg text-[#1d1300]">
          {fmt(value)}
        </span>
      )}
      <span>{text}</span>
    </div>
  );
}

function LeaderboardRow({ rank, name, score, team, highlight }: LeaderboardRowProps) {
  return (
    <li
      aria-label={`${rank}. ${name}, ${fmt(score)} points`}
      data-slot="leaderboard-row"
      className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 border-b border-gm-border px-2 py-3"
    >
      <span
        aria-hidden="true"
        className={cx(
          "font-gm-display text-4xl font-bold",
          highlight ? "text-[var(--gm-gold-line)]" : "text-gm-accent",
        )}
      >
        {rank}
      </span>
      <span aria-hidden="true" className="flex items-center gap-2.5 text-2xl font-bold">
        {team !== undefined && (
          <i className="size-4 rounded-[3px]" style={{ background: `var(--gm-team-${team})` }} />
        )}
        {name}
      </span>
      <span aria-hidden="true" className="font-gm-display text-4xl font-bold tabular-nums">
        {fmt(score)}
      </span>
    </li>
  );
}

export type JudgesTableAnimation = "flip" | "snow-drift" | "shake" | "callout";

/** Which animation Judges' Table plays for each moment (S14-AC8). */
export const JT_ANIMATIONS: Record<MomentKind, JudgesTableAnimation> = {
  "game-finished": "flip",
  points: "callout",
  "rank-change": "callout",
  "lead-change": "snow-drift",
  "team-created": "callout",
  "big-donation": "snow-drift",
  "judged-right": "flip",
  "judged-wrong": "shake",
  "phase-change": "snow-drift",
  "photo-winner": "flip",
  "final-standings": "flip",
};

/** Score cards flip up; on big moments the snow drifts and a gold-and-white flurry falls. */
function Celebration({ moment, onDone }: CelebrationProps) {
  const theme = useTheme();
  const animation = JT_ANIMATIONS[moment.kind];
  const colors = [theme?.tokens.gold ?? "#e5b553", "#ffffff"];
  useCelebrationTimer(
    onDone,
    animation === "flip" || animation === "snow-drift"
      ? () => void fireConfetti({ colors, shapes: ["circle"] })
      : null,
  );
  return (
    <div
      role="status"
      data-slot="celebration"
      data-animation={animation}
      className={cx(
        "pointer-events-none fixed inset-0 z-50 grid place-items-center p-6",
        animation === "snow-drift" &&
          "jt-snowfall motion-safe:animate-[jt-drift_var(--gm-motion-stage)_linear]",
      )}
    >
      <div
        className={cx(
          "grid justify-items-center gap-3 rounded-lg bg-gm-surface px-6 py-5 text-center shadow-2xl",
          animation === "shake" &&
            "motion-safe:animate-[gm-shake_var(--gm-motion-base)_ease-in-out]",
          animation === "callout" &&
            "motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-emphasized)]",
        )}
      >
        {moment.value !== undefined && animation !== "shake" && (
          <ScoreCard label={moment.text} value={moment.value} state="highlight" size="lg" />
        )}
        <p className="m-0 font-gm-display text-3xl font-bold tracking-wide text-gm-text uppercase">
          {moment.text}
        </p>
      </div>
    </div>
  );
}

/** Judges' Table's own slot components (S09-AC11, S14-AC8); the rest are defaults. */
export const judgesTableSlots: Partial<SlotComponents> = {
  Surface,
  Banner,
  ScoreCard,
  Tile,
  Key,
  Progress,
  Toast,
  LeaderboardRow,
  Celebration,
};
