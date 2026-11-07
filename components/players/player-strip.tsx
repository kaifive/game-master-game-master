"use client";

import { PointsIcon } from "@/components/icons/points";
import { CountUp } from "@/components/motion";
import { useOptionalDevice } from "./device";

/**
 * The top of the games list: who's playing and their team on the left, and
 * their total on the right in large numerals, like a competitor's line on
 * the judges' sheet (the Judges' Table first viewport). Points fly here.
 */
export function PlayerStrip() {
  const device = useOptionalDevice();
  if (!device?.active) return null;
  const team = device.seat?.team;
  return (
    <section
      aria-label="You"
      className="flex items-end justify-between gap-4 border-b border-gm-border pb-3"
    >
      <div className="grid min-w-0 gap-0.5">
        <p className="m-0 font-gm-display text-3xl font-bold break-words">
          {device.active.nickname}
        </p>
        {team && (
          <p className="m-0 flex items-center gap-2 text-base font-bold text-gm-text-muted">
            <i
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-[3px]"
              style={{ background: `var(--gm-team-${String(team.color)})` }}
            />
            {team.name}
          </p>
        )}
      </div>
      {/* Nothing until the real total arrives, so it never counts up from 0 on a reload. */}
      {device.totalKnown && (
        <span
          data-total-score
          role="img"
          aria-label={`${device.active.nickname}: ${String(device.total)} points`}
          className="inline-flex shrink-0 items-center gap-2 font-gm-display text-5xl leading-none font-bold text-gm-accent-ink tabular-nums"
        >
          <span className="text-4xl">
            <PointsIcon />
          </span>
          <CountUp value={device.total} />
        </span>
      )}
    </section>
  );
}
