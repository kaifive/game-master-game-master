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

export type AngleScene = { target: number };
export type RibbonScene = { label: string; at: number | null };

/** A team's answer drawn on a scene at the reveal: its palette color and name. */
export type Mark = { id: string; color: number; name: string; value: number };

/** Rounded, so the server's and the browser's trig agree on the drawing (hydration). */
const r2 = (n: number) => Math.round(n * 100) / 100;

const teamColor = (c: number) => `var(--gm-team-${String(c)})`;

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

const PIVOT = { x: 100, y: 104 };
const STAFF = 88;
const tip = (deg: number, len = STAFF) => {
  const a = (deg * Math.PI) / 180;
  return { x: r2(PIVOT.x + Math.cos(a) * len), y: r2(PIVOT.y - Math.sin(a) * len) };
};

/** A wushu staff: a long gold pole with cranberry grip bands, pivoting on the floor line. */
function Pole({ deg, color, width = 6 }: { deg: number; color?: string; width?: number }) {
  const end = tip(deg);
  const band = (from: number, to: number) => {
    const a = tip(deg, from);
    const b = tip(deg, to);
    return `M${String(a.x)} ${String(a.y)}L${String(b.x)} ${String(b.y)}`;
  };
  return (
    <g strokeLinecap="round">
      <path
        d={`M${String(PIVOT.x)} ${String(PIVOT.y)}L${String(end.x)} ${String(end.y)}`}
        stroke={color ?? "var(--gm-tile-correct)"}
        strokeWidth={width}
      />
      {!color && (
        <path
          d={`${band(STAFF - 9, STAFF - 4)}${band(4, 9)}`}
          stroke="var(--gm-accent)"
          strokeWidth={width + 0.5}
          strokeLinecap="butt"
        />
      )}
    </g>
  );
}

/**
 * The floor and the staff. With `onAngle` it's a dial: drag anywhere above
 * the floor to point the staff there, or use the arrow keys. There is no
 * number to read off while turning (spec 28). `marks` are the teams'
 * answers at the reveal; `target` the right angle, drawn as a gold arc.
 */
export function StaffDial({
  angle,
  onAngle,
  target,
  marks = [],
  className,
}: {
  angle: number | null;
  onAngle?: (deg: number) => void;
  target?: number;
  marks?: readonly Mark[];
  className?: string;
}) {
  const dragging = useRef(false);
  const pointTo = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onAngle) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * 200;
    const py = ((e.clientY - box.top) / box.height) * 112;
    const deg = (Math.atan2(PIVOT.y - py, px - PIVOT.x) * 180) / Math.PI;
    // Below the floor counts as the nearer end.
    onAngle(Math.round(deg < -90 ? 180 : deg < 0 ? 0 : deg));
  };
  const arc = (deg: number, r: number) => {
    const end = tip(deg, r);
    return `M${String(PIVOT.x + r)} ${String(PIVOT.y)}A${String(r)} ${String(r)} 0 0 0 ${String(end.x)} ${String(end.y)}`;
  };
  return (
    <svg
      viewBox="0 0 200 112"
      role={onAngle ? "slider" : "img"}
      aria-label={onAngle ? "The staff: drag to turn it" : "The staff"}
      aria-valuemin={onAngle ? 0 : undefined}
      aria-valuemax={onAngle ? 180 : undefined}
      aria-valuenow={onAngle && angle !== null ? angle : undefined}
      tabIndex={onAngle ? 0 : undefined}
      onPointerDown={(e) => {
        if (!onAngle) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointTo(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) pointTo(e);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        if (!onAngle || angle === null) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") onAngle(Math.min(180, angle + step));
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
      {target !== undefined && (
        <path d={arc(target, 26)} stroke="var(--gm-tile-correct)" strokeWidth={2} fill="none" />
      )}
      {marks.map((m) => (
        <g key={m.id} opacity={0.9}>
          <Pole deg={m.value} color={teamColor(m.color)} width={3} />
        </g>
      ))}
      {target !== undefined && <Pole deg={target} />}
      {angle !== null && target === undefined && <Pole deg={angle} />}
      <path
        d={`M8 ${String(PIVOT.y)}H192`}
        stroke="var(--gm-text-muted)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={3.5} fill="var(--gm-text)" />
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
 * scissors there. At the reveal, `truth` shows the right spot in gold and
 * `marks` each team's cut.
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
      {truth !== null && <Snip at={truth} color="var(--gm-tile-correct)" />}
      {cut !== null && truth === null && <Snip at={cut} color="var(--gm-tile-present)" />}
    </svg>
  );
}
