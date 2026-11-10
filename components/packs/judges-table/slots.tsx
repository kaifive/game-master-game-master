"use client";

import { useEffect, useState } from "react";
import { HollyIcon } from "@/components/icons/holly";
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
    <span data-decoration="holly" className="inline-flex shrink-0">
      <HollyIcon className="h-8 w-11" />
    </span>
  );
}

function Banner({ title, subtitle, live, level = 1, aside, lead, size = "md" }: BannerProps) {
  const H = level === 1 ? "h1" : "h2";
  const holly = useDecoration("holly");
  return (
    <header
      data-slot="banner"
      className="jt-band flex items-center gap-3 bg-[var(--gm-band)] px-4 pt-3 pb-4 text-[var(--gm-band-ink)]"
    >
      {lead}
      <div className="min-w-0">
        <H
          className={cx(
            "m-0 font-gm-display font-medium tracking-[0.1em] uppercase",
            size === "lg" ? "text-4xl" : "text-base",
          )}
        >
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
      highlight: "bg-[var(--gm-gold)] text-gm-tile-correct-ink shadow-md",
      blank: "bg-[var(--gm-card-back)] text-[var(--gm-card-back-ink)]",
    },
    size: {
      sm: "h-9 w-12 text-lg",
      md: "h-14 w-[4.5rem] text-3xl",
      lg: "h-24 w-32 text-5xl",
      xl: "h-40 min-w-52 px-6 text-8xl",
    },
  },
  defaults: { state: "scored", size: "md" },
});

/** The last score each card showed, across pages, so a card flips only when its score changes. */
const seen = new Map<string, number>();
const BLANK = -1;

/**
 * Whether a card should flip up: a fresh result, or a score that changed
 * since this card was last seen (on this page or an earlier one). Seeing the
 * same score again doesn't flip it, and neither does a blank card filling in
 * as the page loads: blank means "not known yet", not a score.
 */
function useLanded(key: string, value: number, fresh: boolean): boolean {
  const [landed, setLanded] = useState<number | null>(() => {
    const before = seen.get(key);
    const changed = before !== undefined && before !== BLANK && before !== value;
    return fresh || changed ? value : null;
  });
  const [last, setLast] = useState(value);
  if (last !== value) {
    setLast(value);
    if (last !== BLANK) setLanded(value);
  }
  useEffect(() => {
    seen.set(key, value);
  }, [key, value]);
  return landed === value && value !== BLANK;
}

/** A judge's score card on a handle; flips up when a score lands. */
function ScoreCard({ label, value, state, size = "md", fresh = false }: ScoreCardProps) {
  const scored = state !== "blank" && value !== undefined;
  const landed = useLanded(label, scored ? value : BLANK, fresh);
  // A miss (0) is held up on the frosted card back, as the judges' table does.
  const look = scored && value === 0 && state === "scored" ? "blank" : state;
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
          paddle({ state: look, size }),
          landed && "motion-safe:animate-[jt-flip_420ms_cubic-bezier(0.16,1,0.3,1)]",
        )}
      >
        {scored ? fmt(value) : "?"}
      </span>
      <span
        data-part="handle"
        aria-hidden="true"
        className={cx(
          "rounded-b-[2px]",
          { sm: "h-2.5 w-1.5", md: "h-5 w-2", lg: "h-5 w-2", xl: "h-12 w-3.5" }[size],
          scored && look !== "blank" ? "jt-handle" : "bg-[var(--gm-card-back)]",
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
        <span className="grid h-8 min-w-11 place-items-center rounded-[4px] bg-[var(--gm-gold)] px-1 font-gm-display text-lg text-gm-tile-correct-ink">
          {fmt(value)}
        </span>
      )}
      <span>{text}</span>
    </div>
  );
}

/** Gold, silver and bronze for the podium; everyone else in quiet ink. */
const RANK_INK: Record<number, string> = {
  1: "text-[var(--gm-gold)]",
  2: "text-[var(--gm-rank-silver)]",
  3: "text-[var(--gm-rank-bronze)]",
};

/** A results-board row: place, name, and a score card on its handle. */
/** The medal behind each place, for the podium step's top rule. */
const RANK_RULE: Record<number, string> = {
  1: "var(--gm-gold)",
  2: "var(--gm-rank-silver)",
  3: "var(--gm-rank-bronze)",
};

/** Podium spots: 2 left, 1 in the middle and tallest, 3 right. */
const PODIUM = {
  1: { place: "col-start-2 row-start-1", step: "h-[5.5rem]" },
  2: { place: "col-start-1 row-start-1", step: "h-16" },
  3: { place: "col-start-3 row-start-1", step: "h-12" },
};

/**
 * The TV's top three, standing on the judges' podium: each holds up their
 * score card (the leader's in gold) above their name and a stepped block
 * carrying the place in its medal ink (Khai, 2026-11-10: more engaging).
 */
function PodiumSpot({ rank, name, score, team, spot }: LeaderboardRowProps & { spot: 1 | 2 | 3 }) {
  const landed = useLanded(`row:${name}`, score, false);
  const look = PODIUM[spot];
  return (
    <li
      aria-label={`${rank}. ${name}, ${fmt(score)} points`}
      data-slot="leaderboard-row"
      data-podium={spot}
      className={cx("grid min-w-0 content-end justify-items-center gap-3 text-center", look.place)}
    >
      <span aria-hidden="true" className="inline-grid justify-items-center">
        <span
          key={score}
          className={cx(
            // Grows with the score, so 12,000 fits as well as 40.
            "grid place-items-center rounded-[4px] font-gm-display leading-none font-bold tabular-nums",
            spot === 1
              ? "h-24 min-w-32 bg-[var(--gm-gold)] px-4 text-5xl text-gm-tile-correct-ink shadow-md"
              : "jt-card-shadow h-14 min-w-[4.5rem] bg-[var(--gm-card)] px-3 text-3xl text-[var(--gm-card-ink)]",
            landed && "motion-safe:animate-[jt-flip_420ms_cubic-bezier(0.16,1,0.3,1)]",
          )}
        >
          {fmt(score)}
        </span>
        <span className="jt-handle h-5 w-2 rounded-b-[2px]" />
      </span>
      <span
        aria-hidden="true"
        className="flex max-w-full min-w-0 items-center justify-center gap-2 text-2xl font-bold"
      >
        {team !== undefined && (
          <i
            className="size-4 shrink-0 rounded-[3px]"
            style={{ background: `var(--gm-team-${team})` }}
          />
        )}
        <span className="min-w-0 text-balance break-words">{name}</span>
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "grid w-4/5 place-items-center rounded-t-gm bg-gm-surface-raised font-gm-display font-bold",
          spot === 1 ? "text-6xl" : "text-5xl",
          look.step,
          RANK_INK[rank] ?? "text-gm-text-muted",
        )}
        style={{
          boxShadow: `inset 0 4px 0 ${RANK_RULE[rank] ?? "var(--gm-border)"}, inset 0 0 0 1px var(--gm-border)`,
        }}
      >
        {rank}
      </span>
    </li>
  );
}

function LeaderboardRow(props: LeaderboardRowProps) {
  if (props.podium) return <PodiumSpot {...props} spot={props.podium} />;
  return <BoardRow {...props} />;
}

/** Row sizes: tv is the dense row under the TV's podium; md phones; lg a full-height board. */
const ROW = {
  tv: {
    grid: "grid-cols-[2.75rem_1fr_auto] py-2",
    rank: "text-3xl",
    name: "text-xl",
    swatch: "size-3.5",
    card: "text-2xl",
    handle: "h-2.5 w-1.5",
  },
  md: {
    grid: "grid-cols-[3.5rem_1fr_auto] py-3",
    rank: "text-4xl",
    name: "text-2xl",
    swatch: "size-4",
    card: "text-3xl",
    handle: "h-3 w-1.5",
  },
  lg: {
    grid: "grid-cols-[5rem_1fr_auto] py-4",
    rank: "text-6xl",
    name: "text-4xl",
    swatch: "size-6",
    card: "text-5xl",
    handle: "h-5 w-2",
  },
};

function BoardRow({ rank, name, score, team, highlight, size = "md" }: LeaderboardRowProps) {
  const landed = useLanded(`row:${name}`, score, false);
  const look = ROW[size];
  return (
    <li
      aria-label={`${rank}. ${name}, ${fmt(score)} points`}
      data-slot="leaderboard-row"
      className={cx(
        "grid items-center gap-3 border-b border-gm-border px-2",
        look.grid,
        highlight && "rounded-gm bg-gm-surface",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "font-gm-display font-bold",
          look.rank,
          RANK_INK[rank] ?? "text-gm-text-muted",
        )}
      >
        {rank}
      </span>
      <span
        aria-hidden="true"
        className={cx("flex min-w-0 items-center gap-2.5 font-bold", look.name)}
      >
        {team !== undefined && (
          <i
            className={cx("shrink-0 rounded-[3px]", look.swatch)}
            style={{ background: `var(--gm-team-${team})` }}
          />
        )}
        {/* Long names wrap between words rather than lose their end. */}
        <span className="min-w-0 text-balance break-words">{name}</span>
      </span>
      {/* A score card on its handle; keyed by score so it flips again when the score changes. */}
      <span aria-hidden="true" className="inline-grid justify-items-center">
        <span
          key={score}
          className={cx(
            "jt-card-shadow inline-grid min-w-[2.2em] place-items-center rounded-[4px] bg-[var(--gm-card)] px-1.5 py-0.5 font-gm-display font-bold text-[var(--gm-card-ink)] tabular-nums",
            look.card,
            landed && "motion-safe:animate-[jt-flip_420ms_cubic-bezier(0.16,1,0.3,1)]",
          )}
        >
          {fmt(score)}
        </span>
        <span className={cx("jt-handle rounded-b-[2px]", look.handle)} />
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
