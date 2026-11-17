"use client";

import { useEffect, useState } from "react";
import { CountUp, useFlip, useReducedMotion } from "@/components/motion";
import { useTheme } from "@/components/theme/context";
import { barShare } from "@/lib/motion";
import { readableInk } from "@/lib/themes";
import { cx } from "@/lib/ui";

export type StandingsRow = {
  id: string;
  name: string;
  color: number;
  /** The team's event total before this showdown, and after it. */
  before: number;
  after: number;
};

/** How long the old standings hold before the points roll on (S24-AC10). */
export const STANDINGS_HOLD_MS = 1500;

/** Places with ties sharing: 1, 2, 2, 4. Same-score rows keep name order. */
function ranked(rows: StandingsRow[], key: "before" | "after") {
  const sorted = [...rows].sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name));
  const ranks = new Map<string, number>();
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    ranks.set(r.id, prev && prev[key] === r[key] ? (ranks.get(prev.id) ?? i + 1) : i + 1);
  });
  return { sorted, ranks };
}

/**
 * The team leaderboard updating at the end of a showdown (S24-AC10): the old
 * standings, then each team's showdown points rolling onto its total and the
 * teams sliding into their new places, with who moved up marked. Under
 * reduced motion it shows the new standings at once. Lays out for 10 teams.
 */
export function StandingsUpdate({ rows }: { rows: StandingsRow[] }) {
  const still = useReducedMotion();
  const [rolled, setRolled] = useState(false);
  const after = still || rolled;
  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => {
      setRolled(true);
    }, STANDINGS_HOLD_MS);
    return () => {
      clearTimeout(t);
    };
  }, [still]);

  const old = ranked(rows, "before");
  const now = ranked(rows, "after");
  const { sorted, ranks } = after ? now : old;
  const flip = useFlip(sorted.map((r) => r.id));
  const tokens = useTheme()?.tokens;
  const max = Math.max(1, ...rows.map((r) => r.after));

  return (
    <ol
      aria-label="Team standings"
      data-phase={after ? "after" : "before"}
      className="m-0 grid list-none content-start gap-[1.2vh] p-0"
    >
      {sorted.map((r) => {
        const score = after ? r.after : r.before;
        const gained = r.after - r.before;
        const moved = (old.ranks.get(r.id) ?? 0) - (now.ranks.get(r.id) ?? 0);
        const ink = readableInk(tokens?.[`team-${String(r.color)}`] ?? "#555555");
        return (
          <li
            key={r.id}
            ref={flip(r.id)}
            aria-label={`${String(ranks.get(r.id) ?? 0)}. ${r.name}, ${String(score)} points${
              after && gained > 0 ? `, +${String(gained)}` : ""
            }${after && moved > 0 ? `, up ${String(moved)}` : ""}`}
            className="grid grid-cols-[3.5rem_1fr_9rem] items-center gap-4"
          >
            <span
              aria-hidden="true"
              className="text-right font-gm-display text-[clamp(1.4rem,4.2vh,3rem)] font-bold text-gm-accent-ink"
            >
              {ranks.get(r.id)}
            </span>
            <div aria-hidden="true" className="min-w-0">
              <div
                className="flex h-[clamp(2.4rem,6.4vh,4.6rem)] min-w-fit items-center justify-between gap-4 rounded-gm px-4 font-bold motion-safe:transition-[width] motion-safe:duration-[var(--gm-motion-slow)] motion-safe:ease-[var(--gm-ease-out)]"
                style={{
                  width: `${String(Math.max(18, Math.round(barShare(score, max) * 100)))}%`,
                  background: `var(--gm-team-${String(r.color)})`,
                  color: ink,
                }}
              >
                <span className="truncate text-[clamp(1.1rem,3.2vh,2.4rem)]">{r.name}</span>
                <span className="font-gm-display text-[clamp(1.3rem,3.8vh,2.8rem)]">
                  <CountUp value={score} />
                </span>
              </div>
            </div>
            <span aria-hidden="true" className="flex items-center gap-2 font-gm-display font-bold">
              {gained > 0 && (
                <span
                  className={cx(
                    "text-[clamp(1.1rem,3.2vh,2.4rem)] text-gm-accent-ink tabular-nums",
                    "motion-safe:transition-opacity motion-safe:duration-[var(--gm-motion-base)]",
                    after ? "opacity-100" : "opacity-0",
                  )}
                >
                  +{gained}
                </span>
              )}
              {after && moved > 0 && (
                <span className="rounded-full bg-gm-tile-correct px-2 text-[clamp(0.9rem,2.4vh,1.8rem)] text-gm-tile-correct-ink">
                  ▲{moved}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
