"use client";

import { GiftWrap, type Wrap } from "@/components/games/gift";
import { PRESENT_KINDS } from "@/lib/games";
import type { FlybyView } from "@/lib/live";
import { cx } from "@/lib/ui";
import type { LiveControllerProps, LiveRenderer, LiveTvProps } from "../types";
import {
  GetReady,
  LockedIn,
  NumberPad,
  PhoneNote,
  PhoneResult,
  Reveal,
  TimeLeft,
  useServerTime,
} from "./shared";

/** Fly-by Count (spec 25): presents fly across the TV; teams count them. */

const WRAPS: Wrap[] = [
  { paper: "var(--gm-accent)", ribbon: "var(--gm-tile-correct)", bow: "var(--gm-tile-correct)" },
  { paper: "var(--gm-tile-present)", ribbon: "var(--gm-accent)", bow: "var(--gm-accent)" },
  { paper: "var(--gm-team-4)", ribbon: "var(--gm-tile-present)", bow: "var(--gm-tile-present)" },
];

/**
 * One present, sized by its grid square: red with a gold bow, white with a red
 * ribbon, or green with white stripes. Fly-by Count asks about these kinds by
 * name, and each has a mark besides its color (PRESENT_KINDS).
 */
export function Present({ i, className }: { i: number; className?: string }) {
  const kind = i % WRAPS.length;
  const wrap = WRAPS[kind] ?? WRAPS[0];
  if (!wrap) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative block aspect-square overflow-hidden rounded-[0.15em] shadow-md",
        className,
      )}
      style={{
        background:
          kind === 2
            ? `repeating-linear-gradient(135deg, ${wrap.paper} 0 0.18em, var(--gm-tile-present) 0.18em 0.26em)`
            : wrap.paper,
      }}
    >
      <GiftWrap wrap={wrap} />
    </span>
  );
}

/** "How many presents?", or "How many [present] red presents?" once it's asked. */
export function PresentAsk({ ask, size }: { ask: number | null; size: "tv" | "phone" }) {
  if (ask === null) return <>How many presents?</>;
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-[0.3em]">
      How many
      <Present i={ask} className={size === "tv" ? "w-[1.2em]" : "w-9"} />
      <strong>{PRESENT_KINDS[ask] ?? ""} presents?</strong>
    </span>
  );
}

export type Fly = NonNullable<FlybyView["fly"]>;

/** The presents in their gappy grid; rows shift by half a square so they don't line up. */
function Formation({ fly, numbered = false }: { fly: Fly; numbered?: boolean }) {
  return (
    <div
      className="grid gap-[0.6em]"
      style={{ gridTemplateRows: `repeat(${String(fly.rows)}, 1fr)` }}
    >
      {Array.from({ length: fly.rows }, (_, row) => (
        <div
          key={row}
          className="grid gap-[0.6em]"
          style={{
            gridTemplateColumns: `repeat(${String(fly.cols)}, 2.4em)`,
            transform: `translateX(${String((fly.offsets[row] ?? 0) * 3)}em)`,
          }}
        >
          {Array.from({ length: fly.cols }, (_, col) => {
            const at = fly.cells.findIndex(([r, c]) => r === row && c === col);
            const kind = fly.cells[at]?.[2] ?? 0;
            return at === -1 ? (
              <span key={col} />
            ) : (
              <span key={col} className="relative">
                <Present i={kind} />
                {numbered && (
                  <span className="absolute inset-0 grid place-items-center font-gm-display text-[0.9em] font-bold text-gm-tile-present-ink">
                    <span className="rounded-[0.2em] bg-gm-tile-present px-[0.15em]">{at + 1}</span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * The presents flying in from the right and out to the left over `fly.ms`,
 * on whichever clock is given: the TV's shared one, or a solo phone's (spec 30).
 */
export function FlyingPresents({
  fly,
  elapsed,
  className,
}: {
  fly: Fly;
  elapsed: number;
  className?: string;
}) {
  const p = Math.min(1, Math.max(0, elapsed / fly.ms));
  return (
    <div
      role="img"
      aria-label="Presents flying past"
      className={cx("[container-type:size] relative overflow-hidden", className)}
    >
      <div
        className="absolute top-1/2 left-0 w-max will-change-transform"
        style={{
          transform: `translate(calc(100cqw - ${String(p * 100)}cqw - ${String(p * 100)}%), -50%)`,
          // Each row is a present and a gap, about 3em: every row fits the height (Khai, 2026-11-24).
          fontSize: `min(1em, ${String(Math.floor(9000 / (fly.rows * 3.3)) / 100)}cqh)`,
        }}
      >
        <Formation fly={fly} />
      </div>
    </div>
  );
}

function Tv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as FlybyView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed)
    return (
      <div className="grid gap-[3vh]">
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          There were <span className="text-gm-tile-correct">{g.count}</span>
          {g.ask !== null ? ` ${PRESENT_KINDS[g.ask] ?? ""}` : ""} presents
        </p>
        <Reveal
          view={view}
          answer={(t) => (g.answers?.[t] === undefined ? null : String(g.answers[t]))}
          note={(t) => {
            const a = g.answers?.[t];
            if (a === undefined || g.count === null) return null;
            return a === g.count
              ? "Exactly right!"
              : Math.abs(a - g.count) === 1
                ? "One off"
                : null;
          }}
        />
      </div>
    );
  if (now < g.startsAt)
    return (
      <GetReady
        startsAt={g.startsAt}
        now={now}
        line={g.byKind ? "Count every kind of present!" : "Count the presents!"}
      />
    );
  if (now < g.showEndsAt && g.fly) {
    return (
      <FlyingPresents
        fly={g.fly}
        elapsed={now - g.startsAt}
        className="h-[62vh] text-[clamp(2rem,7vh,5rem)]"
      />
    );
  }
  return (
    <div className="grid gap-[3vh]">
      <p className="m-0 text-center font-gm-display text-[clamp(2.4rem,8vh,6rem)] font-bold">
        <PresentAsk ask={g.ask} size="tv" />
      </p>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />
      <LockedIn view={view} locked={g.lockedIn} />
    </div>
  );
}

function Controller({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as FlybyView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (now < g.showEndsAt)
    return (
      <PhoneNote title="Watch the TV and count!">
        {g.byKind
          ? "Count every kind: you'll find out which one at the end."
          : "Type your number when they've flown by."}
      </PhoneNote>
    );
  return (
    <NumberPad
      prompt={<PresentAsk ask={g.ask} size="phone" />}
      window={g}
      now={now}
      send={send}
      busy={busy}
    />
  );
}

/** Five presents drift across, then the count pops up (S24-AC4). */
function Demo({ still }: { still: boolean }) {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden text-[clamp(1.6rem,6vh,4rem)]">
      <div
        className={cx(
          "flex gap-[0.5em]",
          !still && "motion-safe:animate-[gm-demo-fly_5s_linear_infinite]",
        )}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Present
            key={i}
            i={i}
            className={cx("w-[1.4em]", i % 2 === 1 && "translate-y-[0.6em]")}
          />
        ))}
      </div>
      <span
        className={cx(
          "absolute right-[8%] bottom-[8%] rounded-gm bg-gm-tile-present px-[0.4em] font-gm-display font-bold text-gm-tile-present-ink shadow-md",
          !still && "motion-safe:animate-[gm-demo-answer_5s_linear_infinite]",
        )}
      >
        5
      </span>
    </div>
  );
}

export const flybyRenderer: LiveRenderer = { Tv, Controller, Demo };
