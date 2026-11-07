import { useId, useState } from "react";
import {
  normalizeCode,
  type BannerProps,
  type BuzzerProps,
  type ButtonProps,
  type CodeEntryProps,
  type KeyProps,
  type LeaderboardRowProps,
  type PanelProps,
  type ProgressProps,
  type ScoreCardProps,
  type SlotComponents,
  type SurfaceProps,
  type TileProps,
  type TileState,
  type ToastProps,
} from "@/lib/themes";
import { cx, variants } from "@/lib/ui";
import { Celebration } from "./celebration";

export { Celebration, DEFAULT_ANIMATIONS, useCelebrationTimer } from "./celebration";

/**
 * Default slot components (ADR-022), styled only by theme tokens. A style
 * pack replaces any of these; the rest of the pack's screens use these.
 */

const fmt = (n: number) => n.toLocaleString("en-US");

export function Surface({ children, className }: SurfaceProps) {
  return (
    <div data-slot="surface" className={cx("bg-gm-bg text-gm-text", className)}>
      {children}
    </div>
  );
}

export function Banner({ title, subtitle, live, level = 1, aside, lead, size }: BannerProps) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <header
      data-slot="banner"
      className="flex items-center gap-3 bg-gm-accent px-4 py-3 text-gm-text-on-accent"
    >
      {lead}
      <div className="min-w-0">
        <H className={cx("m-0 font-gm-display font-bold", size === "lg" ? "text-4xl" : "text-xl")}>
          {title}
        </H>
        {subtitle && <p className="m-0 text-sm opacity-90">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {live && (
          <span className="rounded-full bg-gm-surface px-3 py-0.5 text-xs font-bold tracking-widest text-gm-accent-ink">
            LIVE
          </span>
        )}
        {aside}
      </div>
    </header>
  );
}

const button = variants({
  base: "inline-flex min-h-11 items-center justify-center gap-2 rounded-gm px-5 font-gm-display text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    tone: {
      primary: "bg-gm-accent text-gm-text-on-accent hover:bg-gm-accent-hover",
      secondary: "border-2 border-gm-accent-ink bg-gm-surface text-gm-accent-ink",
    },
    size: { md: "", lg: "min-h-14 w-full text-xl" },
  },
  defaults: { tone: "primary", size: "md" },
});

export function Button({ children, onClick, tone, disabled, type = "button", size }: ButtonProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={button({ tone, size })}>
      {children}
    </button>
  );
}

export function Panel({ label, children }: PanelProps) {
  return (
    <section aria-label={label} className="rounded-gm border border-gm-border bg-gm-surface p-4">
      {children}
    </section>
  );
}

const card = variants({
  base: "inline-grid place-items-center rounded-gm font-gm-display font-bold tabular-nums",
  variants: {
    state: {
      scored: "bg-gm-surface-raised text-gm-text shadow-sm ring-1 ring-gm-border",
      blank: "bg-gm-tile-absent text-gm-tile-absent-ink",
      highlight: "bg-gm-tile-correct text-gm-tile-correct-ink",
    },
    size: {
      sm: "h-9 min-w-12 px-2 text-lg",
      md: "h-14 min-w-18 px-3 text-3xl",
      lg: "h-24 min-w-28 px-4 text-5xl",
      xl: "h-40 min-w-48 px-6 text-8xl",
    },
  },
  defaults: { state: "scored", size: "md" },
});

export function ScoreCard({ label, value, state, size }: ScoreCardProps) {
  const scored = state !== "blank" && value !== undefined;
  return (
    <span
      role="img"
      aria-label={scored ? `${label}: ${fmt(value)} points` : `${label}: not scored yet`}
      data-slot="score-card"
      data-state={state}
      className={card({ state, size })}
    >
      {scored ? fmt(value) : "–"}
    </span>
  );
}

const TILE_NAME: Record<TileState, string> = {
  empty: "empty",
  typed: "",
  correct: "correct",
  present: "in the word but elsewhere",
  absent: "not in the word",
};

const tile = variants({
  base: "relative grid size-11 place-items-center rounded-gm font-gm-display text-2xl font-bold uppercase",
  variants: {
    state: {
      empty: "border-2 border-dashed border-gm-border bg-gm-tile-empty",
      typed: "border-2 border-gm-text bg-gm-surface text-gm-text",
      correct: "bg-gm-tile-correct text-gm-tile-correct-ink",
      present: "bg-gm-tile-present text-gm-tile-present-ink ring-2 ring-gm-tile-correct",
      absent: "bg-gm-tile-absent text-gm-tile-absent-ink",
    },
  },
  defaults: { state: "empty" },
});

/** The non-color cue for a tile state: a check for correct, a dot for present. */
export function TileMark({ state, className }: { state: TileState; className?: string }) {
  if (state === "correct")
    return (
      <svg
        data-mark="check"
        aria-hidden="true"
        viewBox="0 0 12 12"
        className={cx("absolute top-1 right-1 size-3", className)}
      >
        <path
          d="m2 6.5 2.5 2.5L10 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (state === "present")
    return (
      <span
        data-mark="dot"
        aria-hidden="true"
        className={cx("absolute top-1 right-1 size-2 rounded-full bg-current", className)}
      />
    );
  return null;
}

export const tileName = (letter: string | undefined, state: TileState) =>
  !letter || state === "empty" ? "empty" : [letter, TILE_NAME[state]].filter(Boolean).join(", ");

export function Tile({ letter, state }: TileProps) {
  return (
    <span
      role="img"
      aria-label={tileName(letter, state)}
      data-slot="tile"
      data-state={state}
      className={tile({ state })}
    >
      <span aria-hidden="true">{state === "empty" ? "" : letter}</span>
      <TileMark state={state} />
    </span>
  );
}

const KEY_NAME = {
  unused: "",
  correct: "correct",
  present: "in the word but elsewhere",
  absent: "not in the word",
};

const key = variants({
  base: "grid h-10 place-items-center rounded-gm font-gm-display text-sm font-bold",
  variants: {
    state: {
      unused: "bg-gm-surface-raised text-gm-text ring-1 ring-gm-border",
      correct: "bg-gm-tile-correct text-gm-tile-correct-ink",
      present: "bg-gm-tile-present text-gm-tile-present-ink ring-2 ring-gm-tile-correct",
      absent: "bg-gm-tile-absent text-gm-tile-absent-ink",
    },
    width: { normal: "w-7", wide: "w-12 text-xs" },
  },
  defaults: { state: "unused", width: "normal" },
});

export const keyName = (label: string, state: KeyProps["state"] = "unused") =>
  [label, KEY_NAME[state]].filter(Boolean).join(", ");

export function Key({ label, state = "unused", wide, onPress }: KeyProps) {
  return (
    <button
      type="button"
      aria-label={keyName(label, state)}
      data-slot="key"
      data-state={state}
      onClick={() => {
        onPress(label);
      }}
      className={key({ state, width: wide ? "wide" : "normal" })}
    >
      {label}
    </button>
  );
}

export function Progress({ done, total, label }: ProgressProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="grid gap-1">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-gm-tile-absent"
      >
        <div className="h-full bg-gm-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gm-text-muted">{`${done} of ${total}`}</span>
    </div>
  );
}

export function Toast({ text, value }: ToastProps) {
  return (
    <div
      data-slot="toast"
      className="flex items-center gap-2 rounded-gm bg-gm-surface-raised px-3 py-2 text-sm font-bold shadow ring-1 ring-gm-border"
    >
      {value !== undefined && (
        <span className="font-gm-display text-gm-accent-ink">{fmt(value)}</span>
      )}
      <span>{text}</span>
    </div>
  );
}

export function LeaderboardRow({ rank, name, score, team, highlight }: LeaderboardRowProps) {
  return (
    <li
      aria-label={`${rank}. ${name}, ${fmt(score)} points`}
      data-slot="leaderboard-row"
      className={cx(
        "grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-gm-border px-3 py-2",
        highlight && "bg-gm-surface-raised",
      )}
    >
      <span aria-hidden="true" className="font-gm-display text-3xl font-bold text-gm-accent-ink">
        {rank}
      </span>
      <span aria-hidden="true" className="flex items-center gap-2 text-xl font-bold">
        {team !== undefined && (
          <i className="size-3 rounded-sm" style={{ background: `var(--gm-team-${team})` }} />
        )}
        {name}
      </span>
      <span aria-hidden="true" className="font-gm-display text-3xl font-bold tabular-nums">
        {fmt(score)}
      </span>
    </li>
  );
}

const BUZZER_NAME = { ready: "Buzz", locked: "Buzzer locked", buzzed: "Buzzed in" };

export function Buzzer({ state, onBuzz }: BuzzerProps) {
  return (
    <button
      type="button"
      aria-label={BUZZER_NAME[state]}
      data-slot="buzzer"
      data-state={state}
      disabled={state !== "ready"}
      onClick={onBuzz}
      className={cx(
        "aspect-square w-full max-w-80 rounded-full font-gm-display text-4xl font-bold",
        state === "ready"
          ? "bg-gm-buzzer text-gm-buzzer-ink active:scale-95"
          : "bg-gm-buzzer-locked text-gm-text-muted",
      )}
    >
      {BUZZER_NAME[state]}
    </button>
  );
}

export function CodeEntry({ onSubmit, error, defaultValue = "" }: CodeEntryProps) {
  const id = useId();
  const [code, setCode] = useState(defaultValue);
  return (
    <form
      className="grid w-full min-w-0 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(normalizeCode(code));
      }}
    >
      <label htmlFor={id} className="text-sm font-bold text-gm-text-muted">
        Code
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
          }}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          aria-invalid={error ? true : undefined}
          className="min-h-11 w-0 min-w-0 flex-1 rounded-gm border-2 border-gm-border bg-gm-surface px-3 font-gm-display text-xl tracking-widest text-gm-text uppercase"
        />
        <Button type="submit">Go</Button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-sm font-bold text-gm-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export const DEFAULT_SLOTS: SlotComponents = {
  Surface,
  Banner,
  Button,
  Panel,
  ScoreCard,
  Tile,
  Key,
  Progress,
  Toast,
  LeaderboardRow,
  Buzzer,
  CodeEntry,
  Celebration,
};
