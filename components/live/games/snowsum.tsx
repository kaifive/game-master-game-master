"use client";

import { runningTotals, type Flake, type SnowView } from "@/lib/live";
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

function Tv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as SnowView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) {
    // The sum step by step, then every team's total.
    const totals = runningTotals(g.flakes ?? []);
    const steps = (g.flakes ?? []).map((f, k) => ({ label: flakeLabel(f), total: totals[k] ?? 0 }));
    return (
      <div className="grid gap-[3vh]">
        <ol
          aria-label="The sum, step by step"
          className="m-0 flex list-none flex-wrap items-center justify-center gap-[1.2vh] p-0 font-gm-display text-[clamp(1.4rem,4.4vh,3.2rem)] font-bold"
        >
          <li>0</li>
          {steps.map((s, i) => (
            <li key={i} className="flex items-baseline gap-[0.3em]">
              <span className="text-gm-accent-ink">{s.label}</span>
              <span className="text-[0.6em] text-gm-text-muted">= {s.total}</span>
            </li>
          ))}
        </ol>
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          The total was <span className="text-gm-tile-correct">{g.total}</span>
        </p>
        <Reveal
          view={view}
          answer={(t) => (g.answers?.[t] === undefined ? null : String(g.answers[t]))}
          note={(t) => {
            const a = g.answers?.[t];
            if (a === undefined || g.total === null) return null;
            return a === g.total
              ? "Exactly right!"
              : Math.abs(a - g.total) === 1
                ? "One off"
                : null;
          }}
        />
      </div>
    );
  }
  if (now < g.startsAt)
    return (
      <GetReady startsAt={g.startsAt} now={now} line="Start at 0 and add up the snowflakes!" />
    );
  if (now < g.showEndsAt && g.flakes) {
    const i = Math.min(g.flakes.length - 1, Math.floor((now - g.startsAt) / g.flakeMs));
    const flake = g.flakes[i];
    // Each flake falls in over the first part of its turn, then holds.
    const p = Math.min(1, ((now - g.startsAt) % g.flakeMs) / (g.flakeMs * 0.45));
    return (
      <div className="grid justify-items-center gap-[2vh]">
        <p className="m-0 font-gm-display text-[clamp(1.4rem,4vh,3rem)] font-bold text-gm-text-muted">
          Snowflake {i + 1} of {g.flakes.length}
        </p>
        <div className="grid h-[56vh] place-items-center">
          {flake && (
            <Snowflake
              key={i}
              label={flakeLabel(flake)}
              className="size-[42vh] text-[clamp(2.4rem,10vh,7rem)] will-change-transform"
              style={{
                transform: `translateY(${String((1 - p) * -14)}vh)`,
                opacity: 0.4 + p * 0.6,
              }}
              spin={(1 - p) * -40}
            />
          )}
        </div>
      </div>
    );
  }
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

/** Three flakes fall in turn: +3, +2, ×2, then the total 10 (S24-AC4). */
function Demo({ still }: { still: boolean }) {
  const flakes = ["+3", "+2", "×2"];
  return (
    <div className="relative grid h-full w-full grid-cols-4 place-items-center text-[clamp(1rem,4vh,2.4rem)]">
      {flakes.map((f, i) => (
        <Snowflake
          key={f}
          label={f}
          className={cx(
            "size-[5em]",
            !still && "motion-safe:animate-[gm-demo-fall_6s_var(--gm-ease-out)_infinite]",
          )}
          style={{ animationDelay: `${String(i)}s` }}
        />
      ))}
      <span
        className={cx(
          "rounded-gm bg-gm-tile-present px-[0.5em] font-gm-display text-[1.8em] font-bold text-gm-tile-present-ink shadow-md",
          !still && "motion-safe:animate-[gm-demo-answer_6s_linear_infinite]",
        )}
      >
        = 10
      </span>
    </div>
  );
}

export const snowsumRenderer: LiveRenderer = { Tv, Controller, Demo };
