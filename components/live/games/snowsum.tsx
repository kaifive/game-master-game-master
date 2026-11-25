"use client";

import type { Flake, SnowView } from "@/lib/live";
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

/** Snow Sum (spec 25): snowflakes with +3, −2 or ×2 fall one at a time; keep the total. */

export const flakeLabel = (f: Flake) =>
  f.op === "add" ? `+${String(f.n)}` : f.op === "sub" ? `−${String(f.n)}` : "×2";

/** A six-armed snowflake, drawn one stroke, with its sum in the middle. */
export function Snowflake({
  label,
  className,
  style,
  spin,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  /** Turns the flake, not its number, as it falls. */
  spin?: number;
}) {
  return (
    <span
      aria-label={label}
      role="img"
      style={style}
      className={cx("relative inline-grid place-items-center", className)}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="col-start-1 row-start-1 h-full w-full text-gm-tile-present"
        style={spin === undefined ? undefined : { transform: `rotate(${String(spin)}deg)` }}
      >
        <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
          {[0, 60, 120].map((a) => (
            <g key={a} transform={`rotate(${String(a)} 50 50)`}>
              <path d="M50 4v92" />
              <path d="M50 18l-9-9M50 18l9-9M50 82l-9 9M50 82l9 9" />
            </g>
          ))}
        </g>
        <circle cx="50" cy="50" r="22" fill="var(--gm-accent)" />
      </svg>
      <span className="relative col-start-1 row-start-1 font-gm-display font-bold text-gm-text-on-accent">
        {label}
      </span>
    </span>
  );
}

/**
 * The snowflakes falling one at a time, each over the first part of its turn
 * and then holding, on whichever clock is given: the TV's or a solo phone's
 * (spec 30).
 */
export function FallingFlakes({
  flakes,
  flakeMs,
  elapsed,
  size,
}: {
  flakes: readonly Flake[];
  flakeMs: number;
  elapsed: number;
  size: "tv" | "phone";
}) {
  const at = Math.max(0, elapsed);
  const i = Math.min(flakes.length - 1, Math.floor(at / flakeMs));
  const flake = flakes[i];
  const p = Math.min(1, (at % flakeMs) / (flakeMs * 0.45));
  const tv = size === "tv";
  return (
    <div className={cx("grid justify-items-center", tv ? "gap-[2vh]" : "gap-2")}>
      <p
        className={cx(
          "m-0 font-gm-display font-bold text-gm-text-muted",
          tv ? "text-[clamp(1.4rem,4vh,3rem)]" : "text-xl",
        )}
      >
        Do the math!
      </p>
      <div className={cx("grid place-items-center", tv ? "h-[56vh]" : "h-72")}>
        {flake && (
          <Snowflake
            key={i}
            label={flakeLabel(flake)}
            className={cx(
              "will-change-transform",
              tv ? "size-[42vh] text-[clamp(2.4rem,10vh,7rem)]" : "size-56 text-5xl",
            )}
            style={{
              transform: `translateY(${String((1 - p) * -14)}${tv ? "vh" : "%"})`,
              opacity: 0.4 + p * 0.6,
            }}
            spin={(1 - p) * -40}
          />
        )}
      </div>
    </div>
  );
}

function Tv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as SnowView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) {
    // Just the total, then every team's: no working shown (Khai, 2026-11-24).
    return (
      <div className="grid gap-[3vh]">
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          The total was <span className="text-gm-tile-correct">{g.total}</span>
        </p>
        <Reveal
          view={view}
          answer={(t) => (g.answers?.[t] === undefined ? null : String(g.answers[t]))}
          note={(t) => {
            const a = g.answers?.[t];
            if (a === undefined || g.total === null) return null;
            return a === g.total ? "Exactly right!" : null;
          }}
        />
      </div>
    );
  }
  if (now < g.startsAt) return <GetReady startsAt={g.startsAt} now={now} line="Do the math!" />;
  if (now < g.showEndsAt && g.flakes)
    return (
      <FallingFlakes flakes={g.flakes} flakeMs={g.flakeMs} elapsed={now - g.startsAt} size="tv" />
    );
  return (
    <div className="grid gap-[3vh]">
      <p className="m-0 text-center font-gm-display text-[clamp(2.4rem,8vh,6rem)] font-bold">
        What&apos;s the total?
      </p>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />
      <LockedIn view={view} locked={g.lockedIn} />
    </div>
  );
}

function Controller({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as SnowView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (now < g.showEndsAt)
    return (
      <PhoneNote title="Watch the TV and add up!">Start at 0. Type the total at the end.</PhoneNote>
    );
  return (
    <NumberPad
      prompt="What's the total?"
      window={g}
      now={now}
      send={send}
      busy={busy}
      negative
      max={200}
    />
  );
}

/** Three flakes fall in turn: +3, +2, ×2; someone in the room calls out 10 (S24-AC4). */
function Demo({ still }: { still: boolean }) {
  const flakes = ["+3", "+2", "×2"];
  return (
    // The flakes fall in from above the demo screen: clipped on purpose.
    <div
      data-allow-clip
      className="grid h-full w-full grid-cols-3 place-items-center px-[6%] text-[clamp(0.8rem,3vh,1.8rem)]"
    >
      {flakes.map((f, i) => (
        <Snowflake
          key={f}
          label={f}
          className={cx(
            "size-[4.5em]",
            !still && "motion-safe:animate-[gm-demo-fall_6s_var(--gm-ease-out)_infinite]",
          )}
          style={{ animationDelay: `${String(i)}s` }}
        />
      ))}
    </div>
  );
}

export const snowsumRenderer: LiveRenderer = { Tv, Controller, Demo };
