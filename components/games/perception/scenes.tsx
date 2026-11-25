"use client";

import { useRef } from "react";
import { cx } from "@/lib/ui";

/**
 * What the perception games draw (spec 28), shared by the solo phone, the
 * showdown TV and the captain's phone. Every scene is an SVG on a fixed
 * viewBox, so it scales from a 375 px phone to a 1080p TV. Answers ride as
 * shares of the scene (0 to 1), so a tap on a phone and a mark on the TV
 * mean the same spot.
 */

/** The angle to set, and how far the staff can turn this round (180, 360 or 540). */
export type AngleScene = { target: number; max?: number };
export type RibbonScene = { label: string; at: number | null };

/** A team's answer drawn on a scene at the reveal: its palette color and name. */
export type Mark = { id: string; color: number; name: string; value: number };

/** Rounded, so the server's and the browser's trig agree on the drawing (hydration). */
const r2 = (n: number) => Math.round(n * 100) / 100;

const teamColor = (c: number) => `var(--gm-team-${String(c)})`;

/**
 * The right answer's mark at the reveal: a white star, so it never looks like
 * a team's mark, whatever the teams' colors (Khai, 2026-11-25: a gold team
 * looked like the gold right answer).
 */
function Star({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 === 0 ? r : r * 0.45;
    return `${String(r2(x + Math.cos(a) * d))},${String(r2(y + Math.sin(a) * d))}`;
  }).join(" ");
  return (
    <polygon
      points={points}
      fill="var(--gm-tile-present)"
      stroke="var(--gm-tile-present-ink)"
      strokeWidth={0.6}
    />
  );
}

/** A share from 0 to 1, to three places, as answers are sent. */
const share3 = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 1000) / 1000;

/** A share of a pointer's way across (or down) an element, 0 to 1. */
function shareOf(e: React.PointerEvent, axis: "x" | "y", from = 0, to = 1) {
  const box = e.currentTarget.getBoundingClientRect();
  const raw =
    axis === "x" ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height;
  return share3((raw - from) / (to - from));
}

// ---- Staff Angle

/** Where the staff pivots: on the floor for a half turn, in the middle for a dial that winds. */
type Pivot = { x: number; y: number };
const PIVOT: Pivot = { x: 100, y: 104 };
const HUB: Pivot = { x: 100, y: 100 };
const STAFF = 88;
const SPOKE = 74;
const tip = (deg: number, len = STAFF, at: Pivot = PIVOT) => {
  const a = (deg * Math.PI) / 180;
  return { x: r2(at.x + Math.cos(a) * len), y: r2(at.y - Math.sin(a) * len) };
};

/** A wushu staff: a long gold pole with cranberry grip bands, pivoting at `at`. */
function Pole({
  deg,
  color,
  width = 6,
  len = STAFF,
  at = PIVOT,
}: {
  deg: number;
  color?: string;
  width?: number;
  len?: number;
  at?: Pivot;
}) {
  const end = tip(deg, len, at);
  const band = (from: number, to: number) => {
    const a = tip(deg, from, at);
    const b = tip(deg, to, at);
    return `M${String(a.x)} ${String(a.y)}L${String(b.x)} ${String(b.y)}`;
  };
  return (
    <g strokeLinecap="round">
      <path
        d={`M${String(at.x)} ${String(at.y)}L${String(end.x)} ${String(end.y)}`}
        stroke={color ?? "var(--gm-tile-correct)"}
        strokeWidth={width}
      />
      {!color && (
        <path
          d={`${band(len - 9, len - 4)}${band(4, 9)}`}
          stroke="var(--gm-accent)"
          strokeWidth={width + 0.5}
          strokeLinecap="butt"
        />
      )}
    </g>
  );
}

/**
 * How far the staff has turned, as a spiral out from the hub: past a full
 * turn it keeps going on a wider loop, so 450° doesn't look like 90°.
 */
function Sweep({
  deg,
  from,
  color,
  width,
}: {
  deg: number;
  from: number;
  color: string;
  width: number;
}) {
  if (deg <= 0) return null;
  const points: string[] = [];
  for (let a = 0; a <= deg; a = Math.min(deg, a + 4)) {
    const p = tip(a, from + (a / 360) * 16, HUB);
    points.push(`${String(p.x)},${String(p.y)}`);
    if (a === deg) break;
  }
  return (
    <polyline
      points={points.join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/**
 * The angle a pointer means. A tap picks, of the turns the dial allows, the
 * one nearest where the staff is; a drag follows the hand round and stops at
 * 0 or the round's limit rather than jumping a whole turn.
 */
export function windTo(raw: number, prev: number, max: number, drag = false): number {
  const base = ((raw % 360) + 360) % 360;
  if (drag) {
    let delta = base - (((prev % 360) + 360) % 360);
    if (delta > 180) delta -= 360;
    if (delta <= -180) delta += 360;
    return Math.round(Math.max(0, Math.min(max, prev + delta)));
  }
  let best = Math.min(base, max);
  for (let turn = 0; turn * 360 + base <= max; turn++) {
    const c = turn * 360 + base;
    if (Math.abs(c - prev) < Math.abs(best - prev)) best = c;
  }
  return Math.round(best);
}

/**
 * The staff. With `onAngle` it's a dial: drag to point the staff, or use the
 * arrow keys. There is no number to read off while turning (spec 28).
 * Up to 180° the staff stands on the floor; up to 360° or 540° (rounds 2 and
 * 3) it turns on a full dial from the line pointing right, round and round,
 * with its sweep drawn. `marks` are the teams' answers at the reveal;
 * `target` the right angle: the staff outlined in white with a star.
 */
export function StaffDial({
  angle,
  onAngle,
  target,
  marks = [],
  max = 180,
  className,
}: {
  angle: number | null;
  onAngle?: (deg: number) => void;
  target?: number;
  marks?: readonly Mark[];
  /** How far the staff can turn: 180, 360 or 540 degrees. */
  max?: number;
  className?: string;
}) {
  const dragging = useRef(false);
  const full = max > 180;
  const at = full ? HUB : PIVOT;
  const len = full ? SPOKE : STAFF;
  const height = full ? 200 : 112;
  const pointTo = (e: React.PointerEvent<SVGSVGElement>, drag = false) => {
    if (!onAngle) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * 200;
    const py = ((e.clientY - box.top) / box.height) * height;
    const deg = (Math.atan2(at.y - py, px - at.x) * 180) / Math.PI;
    if (full) onAngle(windTo(deg, angle ?? 0, max, drag));
    // Below the floor counts as the nearer end.
    else onAngle(Math.round(deg < -90 ? 180 : deg < 0 ? 0 : deg));
  };
  const arc = (deg: number, r: number) => {
    const end = tip(deg, r);
    return `M${String(PIVOT.x + r)} ${String(PIVOT.y)}A${String(r)} ${String(r)} 0 0 0 ${String(end.x)} ${String(end.y)}`;
  };
  return (
    <svg
      viewBox={`0 0 200 ${String(height)}`}
      role={onAngle ? "slider" : "img"}
      aria-label={onAngle ? "The staff: drag to turn it" : "The staff"}
      aria-valuemin={onAngle ? 0 : undefined}
      aria-valuemax={onAngle ? max : undefined}
      aria-valuenow={onAngle && angle !== null ? angle : undefined}
      tabIndex={onAngle ? 0 : undefined}
      onPointerDown={(e) => {
        if (!onAngle) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointTo(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) pointTo(e, true);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        if (!onAngle || angle === null) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") onAngle(Math.min(max, angle + step));
        else if (e.key === "ArrowRight" || e.key === "ArrowDown")
          onAngle(Math.max(0, angle - step));
        else return;
        e.preventDefault();
      }}
      className={cx(
        "block w-full rounded-gm bg-gm-surface ring-1 ring-gm-border",
        onAngle && "cursor-grab touch-none select-none active:cursor-grabbing",
        className,
      )}
    >
      {full && (
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r={SPOKE + 6}
          fill="none"
          stroke="var(--gm-border)"
          strokeWidth={1}
        />
      )}
      {target !== undefined &&
        (full ? (
          <Sweep deg={target} from={18} color="var(--gm-tile-present)" width={2} />
        ) : (
          <path d={arc(target, 26)} stroke="var(--gm-tile-present)" strokeWidth={2} fill="none" />
        ))}
      {marks.map((m, i) => (
        <g key={m.id} opacity={0.9}>
          {full && <Sweep deg={m.value} from={24 + i * 4} color={teamColor(m.color)} width={1.5} />}
          <Pole deg={m.value} color={teamColor(m.color)} width={3} len={len} at={at} />
        </g>
      ))}
      {target !== undefined && (
        <g aria-label="The right angle">
          {/* A white outline and a star set the right angle apart from every team's. */}
          <path
            d={`M${String(at.x)} ${String(at.y)}L${String(tip(target, len, at).x)} ${String(tip(target, len, at).y)}`}
            stroke="var(--gm-tile-present)"
            strokeWidth={10}
            strokeLinecap="round"
          />
          <Pole deg={target} len={len} at={at} />
          <Star x={tip(target, len + 9, at).x} y={tip(target, len + 9, at).y} r={6} />
        </g>
      )}
      {angle !== null && target === undefined && (
        <>
          {full && <Sweep deg={angle} from={18} color="var(--gm-tile-correct)" width={2.5} />}
          <Pole deg={angle} len={len} at={at} />
        </>
      )}
      {full ? (
        // Where every turn starts: the line pointing right.
        <path
          d={`M${String(HUB.x)} ${String(HUB.y)}H${String(HUB.x + SPOKE + 10)}`}
          stroke="var(--gm-text-muted)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M8 ${String(PIVOT.y)}H192`}
          stroke="var(--gm-text-muted)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}
      <circle cx={at.x} cy={at.y} r={3.5} fill="var(--gm-text)" />
    </svg>
  );
}

// ---- Cut the Ribbon

const RIB_X0 = 8;
const RIB_X1 = 192;
const ribX = (share: number) => RIB_X0 + share * (RIB_X1 - RIB_X0);

/** Scissors over the ribbon at a share of its length, with a cut line through it. */
function Snip({ at, color }: { at: number; color: string }) {
  const x = ribX(at);
  return (
    <g>
      <path d={`M${String(x)} 9V35`} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <path d={`M${String(x - 3.5)} 3L${String(x)} 9L${String(x + 3.5)} 3Z`} fill={color} />
    </g>
  );
}

/**
 * The ribbon, with no marks on it. With `onCut` a tap (or drag) puts the
 * scissors there. At the reveal, `truth` shows the right spot as a white star
 * over a dashed line, and `marks` each team's cut in its color.
 */
export function RibbonStrip({
  cut,
  onCut,
  truth = null,
  marks = [],
  className,
}: {
  cut: number | null;
  onCut?: (at: number) => void;
  truth?: number | null;
  marks?: readonly Mark[];
  className?: string;
}) {
  const dragging = useRef(false);
  const from = RIB_X0 / 200;
  const to = RIB_X1 / 200;
  return (
    <svg
      viewBox="0 0 200 40"
      role={onCut ? "slider" : "img"}
      aria-label={onCut ? "The ribbon: tap where to cut" : "The ribbon"}
      aria-valuemin={onCut ? 0 : undefined}
      aria-valuemax={onCut ? 100 : undefined}
      aria-valuenow={onCut && cut !== null ? Math.round(cut * 100) : undefined}
      tabIndex={onCut ? 0 : undefined}
      onPointerDown={(e) => {
        if (!onCut) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onCut(shareOf(e, "x", from, to));
      }}
      onPointerMove={(e) => {
        if (dragging.current && onCut) onCut(shareOf(e, "x", from, to));
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        if (!onCut) return;
        const now = cut ?? 0.5;
        if (e.key === "ArrowRight") onCut(share3(now + 0.01));
        else if (e.key === "ArrowLeft") onCut(share3(now - 0.01));
        else return;
        e.preventDefault();
      }}
      className={cx("block w-full", onCut && "cursor-pointer touch-none select-none", className)}
    >
      <rect x={RIB_X0} y={14} width={RIB_X1 - RIB_X0} height={16} rx={1} fill="var(--gm-accent)" />
      <path
        d={`M${String(RIB_X0)} 16.5H${String(RIB_X1)}M${String(RIB_X0)} 27.5H${String(RIB_X1)}`}
        stroke="var(--gm-tile-correct)"
        strokeWidth={0.8}
      />
      {marks.map((m) => (
        <Snip key={m.id} at={m.value} color={teamColor(m.color)} />
      ))}
      {truth !== null && (
        <g aria-label="The right spot">
          <path
            d={`M${String(ribX(truth))} 9V35`}
            stroke="var(--gm-tile-present)"
            strokeWidth={1.6}
            strokeDasharray="2.5 1.5"
          />
          <Star x={ribX(truth)} y={4.5} r={4.5} />
        </g>
      )}
      {cut !== null && truth === null && <Snip at={cut} color="var(--gm-tile-present)" />}
    </svg>
  );
}
