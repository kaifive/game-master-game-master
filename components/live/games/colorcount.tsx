"use client";

import { ORNAMENT_COLORS, type ColorView } from "@/lib/live";
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

/**
 * Color Count (spec 25): ornaments flash on the TV; only at the end does it
 * ask how many of one color there were. Each color also has its own pattern,
 * so it can be counted without telling the colors apart.
 */

/** Each ornament color: a team-palette token and a pattern drawn over it. */
const LOOK: Record<(typeof ORNAMENT_COLORS)[number], { token: string; pattern: string }> = {
  red: { token: "team-1", pattern: "stripes" },
  green: { token: "team-4", pattern: "dots" },
  blue: { token: "team-2", pattern: "zigzag" },
  gold: { token: "team-3", pattern: "star" },
  purple: { token: "team-5", pattern: "rings" },
};

const name = (i: number) => ORNAMENT_COLORS[i] ?? "red";

/** Each pattern's name, said with its color, so color isn't the only way to count. */
const PATTERN_NAME: Record<string, string> = {
  stripes: "striped",
  dots: "spotted",
  zigzag: "zigzag",
  star: "starred",
  rings: "ringed",
};

function Pattern({ kind }: { kind: string }) {
  const ink = { stroke: "var(--gm-tile-present)", strokeWidth: 4, fill: "none", opacity: 0.75 };
  if (kind === "stripes")
    return (
      <g {...ink}>
        <path d="M18 44h64M14 60h72M20 76h60" />
      </g>
    );
  if (kind === "dots")
    return (
      <g fill="var(--gm-tile-present)" opacity={0.75}>
        {[
          [34, 48],
          [56, 44],
          [46, 64],
          [66, 66],
          [30, 72],
        ].map(([x, y]) => (
          <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} />
        ))}
      </g>
    );
  if (kind === "zigzag")
    return (
      <g {...ink}>
        <path d="M16 52l11 10 11-10 12 10 12-10 11 10 11-10" />
      </g>
    );
  if (kind === "star")
    return (
      <path
        d="M50 40l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z"
        fill="var(--gm-tile-present)"
        opacity={0.8}
      />
    );
  return (
    <g {...ink}>
      <circle cx="50" cy="60" r="10" />
      <circle cx="50" cy="60" r="20" />
    </g>
  );
}

/** A bauble: hook, cap and a round body in its color and pattern. */
export function Ornament({
  color,
  className,
  dim = false,
  style,
}: {
  color: number;
  className?: string;
  dim?: boolean;
  style?: React.CSSProperties;
}) {
  const look = LOOK[name(color)];
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${name(color)} ornament`}
      style={style}
      className={cx(dim && "opacity-25", className)}
    >
      <path d="M50 4v10" stroke="var(--gm-text-muted)" strokeWidth="3" fill="none" />
      <rect x="40" y="14" width="20" height="10" rx="2" fill="var(--gm-tile-correct)" />
      <circle cx="50" cy="60" r="36" fill={`var(--gm-${look.token})`} />
      <Pattern kind={look.pattern} />
      <circle cx="38" cy="46" r="7" fill="var(--gm-tile-present)" opacity={0.35} />
    </svg>
  );
}

/** "How many red?", with the ornament beside the word. */
function Ask({ color, size }: { color: number; size: "tv" | "phone" }) {
  return (
    <span className="inline-flex items-center gap-[0.3em]">
      How many
      <Ornament color={color} className={size === "tv" ? "size-[1.3em]" : "size-10"} />
      <strong className="font-bold">{`${name(color)} (${PATTERN_NAME[LOOK[name(color)].pattern] ?? ""}) ornaments?`}</strong>
    </span>
  );
}

function Tv({ view, game, serverNow, revealed }: LiveTvProps) {
  const g = game as ColorView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed && g.ask !== null && g.flashes)
    return (
      <div className="grid gap-[3vh]">
        <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
          There were <span className="text-gm-tile-correct">{g.truth}</span> {name(g.ask)}
        </p>
        <div className="flex flex-wrap justify-center gap-[0.8vh]" aria-label="Every ornament">
          {g.flashes.flat().map((o, i) => (
            <Ornament key={i} color={o.color} dim={o.color !== g.ask} className="size-[6vh]" />
          ))}
        </div>
        <Reveal
          view={view}
          answer={(t) => (g.answers?.[t] === undefined ? null : String(g.answers[t]))}
          note={(t) => (g.answers?.[t] === g.truth ? "Exactly right!" : null)}
        />
      </div>
    );
  if (now < g.startsAt)
    return <GetReady startsAt={g.startsAt} now={now} line="Keep track of every color!" />;
  if (now < g.showEndsAt && g.flashes) {
    const i = Math.min(
      g.flashes.length - 1,
      Math.floor(((now - g.startsAt) / (g.showEndsAt - g.startsAt)) * g.flashes.length),
    );
    return (
      <div aria-label="Ornaments flashing" className="relative h-[62vh]">
        {(g.flashes[i] ?? []).map((o, j) => (
          <Ornament
            key={`${String(i)}-${String(j)}`}
            color={o.color}
            className="absolute size-[20vh] motion-safe:animate-[gm-pop_var(--gm-motion-fast)_var(--gm-ease-out)]"
            style={{ left: `${String(o.x * 85)}%`, top: `${String(o.y * 70)}%` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-[3vh]">
      <p className="m-0 text-center font-gm-display text-[clamp(2.4rem,8vh,6rem)] font-bold">
        {g.ask === null ? "Get ready to answer…" : <Ask color={g.ask} size="tv" />}
      </p>
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />
      <LockedIn view={view} locked={g.lockedIn} />
    </div>
  );
}

function Controller({ view, game, serverNow, revealed, send, busy }: LiveControllerProps) {
  const g = game as ColorView | null;
  const now = useServerTime(serverNow, !revealed);
  if (!g) return null;
  if (revealed) return <PhoneResult view={view} />;
  if (now < g.showEndsAt || g.ask === null)
    return (
      <PhoneNote title="Watch the ornaments!">
        Count every color. You&apos;ll find out which one at the end.
      </PhoneNote>
    );
  return (
    <NumberPad
      prompt={<Ask color={g.ask} size="phone" />}
      window={g}
      now={now}
      send={send}
      busy={busy}
    />
  );
}

/** Ornaments blink in, then the question comes up (S24-AC4). */
function Demo({ still }: { still: boolean }) {
  const shown = [0, 1, 2, 0, 1];
  return (
    <div className="relative grid h-full w-full grid-cols-5 place-items-center gap-2 p-[6%]">
      {shown.map((c, i) => (
        <Ornament
          key={i}
          color={c}
          className={cx(
            "size-[min(16vh,8rem)]",
            !still && "motion-safe:animate-[gm-demo-flash_5s_linear_infinite]",
          )}
          style={{ animationDelay: `${String(i * 0.6)}s` }}
        />
      ))}
    </div>
  );
}

export const colorcountRenderer: LiveRenderer = { Tv, Controller, Demo };
