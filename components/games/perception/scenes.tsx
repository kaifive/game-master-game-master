"use client";

import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/ui";

/**
 * What the perception games draw (spec 28), shared by the solo phone, the
 * showdown TV and the captain's phone. Every scene is an SVG on a fixed
 * viewBox, so it scales from a 375 px phone to a 1080p TV. Answers ride as
 * shares of the scene (0 to 1), so a tap on a phone and a mark on the TV
 * mean the same spot.
 */

export type SnowScene = { flakes: [number, number][]; count: number | null };
export type AngleScene = { target: number };
export type SleighScene = {
  startY: number;
  slope: number;
  cloudFrom: number;
  cloudTo: number;
  flightMs: number;
  exitY: number | null;
};
export type DrumScene = { intervalMs: number; shown: number; keep: number };
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

// ---- Snow Pile

/** One six-spoked snowflake, drawn as three strokes with little V tips. */
function Flake({ x, y, r }: { x: number; y: number; r: number }) {
  const spokes = [0, 60, 120].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = r2(Math.cos(a) * r);
    const dy = r2(Math.sin(a) * r);
    return `M${String(x - dx)} ${String(y - dy)}L${String(x + dx)} ${String(y + dy)}`;
  });
  return <path d={spokes.join("")} />;
}

const SNOW_W = 160;
const SNOW_H = 100;

/** The pile: flakes on a night panel; at the reveal, the count over them. */
export function SnowField({
  scene,
  className,
  label = "Snowflakes",
}: {
  scene: SnowScene;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${String(SNOW_W)} ${String(SNOW_H)}`}
      role="img"
      aria-label={scene.count === null ? label : `${String(scene.count)} snowflakes`}
      className={cx("block w-full rounded-gm bg-gm-surface ring-1 ring-gm-border", className)}
    >
      <g
        stroke="var(--gm-text)"
        strokeWidth={0.9}
        strokeLinecap="round"
        opacity={scene.count === null ? 1 : 0.45}
      >
        {scene.flakes.map(([x, y], i) => (
          <Flake key={i} x={6 + x * (SNOW_W - 12)} y={6 + y * (SNOW_H - 12)} r={2.6} />
        ))}
      </g>
    </svg>
  );
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

// ---- Sleigh Run

const SKY_W = 160;
const SKY_H = 100;

/** A little sleigh: a runner curling up at the front, a box body and a gold trim. */
function Sleigh({ x, y, tilt }: { x: number; y: number; tilt: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) rotate(${String(tilt)})`}>
      <path
        d="M-8 3.5H5.5Q8.5 3.5 8.5 0.5"
        stroke="var(--gm-tile-correct)"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M-7 2V-3.5H1L4.5 2Z" fill="var(--gm-accent)" />
      <path d="M-7 -3.5H1" stroke="var(--gm-tile-correct)" strokeWidth={1} />
    </g>
  );
}

/** The cloud bank: a soft band with a scalloped near edge, its far edge marked. */
function Cloud({ from, to }: { from: number; to: number }) {
  const x0 = from * SKY_W;
  const x1 = to * SKY_W;
  const puffs = Array.from({ length: 9 }, (_, i) => (i + 0.5) * (SKY_H / 9));
  return (
    <g>
      <rect x={x0} y={0} width={x1 - x0} height={SKY_H} fill="var(--gm-surface-raised)" />
      {puffs.map((cy) => (
        <circle key={cy} cx={x0} cy={cy} r={SKY_H / 16} fill="var(--gm-surface-raised)" />
      ))}
      <path
        d={`M${String(x1)} 0V${String(SKY_H)}`}
        stroke="var(--gm-accent-ink)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    </g>
  );
}

/**
 * The sky. While `elapsed` is within the flight, the sleigh flies in from the
 * left toward the cloud; after, it's gone. With `onPick` a tap anywhere sets
 * the height on the cloud's far edge. At the reveal (`scene.exitY`), its real
 * path through the cloud shows, with the teams' picks on the edge.
 */
export function SleighSky({
  scene,
  elapsed,
  pick = null,
  onPick,
  marks = [],
  className,
}: {
  scene: SleighScene;
  elapsed: number;
  pick?: number | null;
  onPick?: (y: number) => void;
  marks?: readonly Mark[];
  className?: string;
}) {
  const entryX = scene.cloudFrom * SKY_W;
  const edge = scene.cloudTo * SKY_W;
  const yAt = (x: number) => (scene.startY + scene.slope * (x / SKY_W)) * SKY_H;
  const flying = scene.exitY === null && elapsed >= 0 && elapsed < scene.flightMs;
  const x = Math.min(1, Math.max(0, elapsed / scene.flightMs)) * entryX;
  // The slope is in shares of each side; the screen is wider than tall.
  const tilt = (Math.atan((scene.slope * SKY_H) / SKY_W) * 180) / Math.PI;
  return (
    <svg
      viewBox={`0 0 ${String(SKY_W)} ${String(SKY_H)}`}
      role={onPick ? "button" : "img"}
      aria-label={
        onPick
          ? "Tap where the sleigh comes out of the cloud"
          : flying
            ? "The sleigh flying"
            : "The cloud"
      }
      onPointerDown={(e) => {
        if (onPick) onPick(shareOf(e, "y"));
      }}
      className={cx(
        "block w-full overflow-hidden rounded-gm bg-gm-surface ring-1 ring-gm-border",
        onPick && "cursor-crosshair touch-none select-none",
        className,
      )}
    >
      <Cloud from={scene.cloudFrom} to={scene.cloudTo} />
      {flying && <Sleigh x={x} y={yAt(x)} tilt={tilt} />}
      {scene.exitY !== null && (
        <>
          <path
            d={`M0 ${String(yAt(0))}L${String(entryX)} ${String(yAt(entryX))}`}
            stroke="var(--gm-text-muted)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <path
            d={`M${String(entryX)} ${String(yAt(entryX))}L${String(edge)} ${String(scene.exitY * SKY_H)}`}
            stroke="var(--gm-tile-correct)"
            strokeWidth={1.2}
            strokeDasharray="2 2"
          />
          <Sleigh x={edge + 9} y={scene.exitY * SKY_H} tilt={tilt} />
        </>
      )}
      {marks.map((m) => (
        <rect
          key={m.id}
          x={edge - 6}
          y={m.value * SKY_H - 2}
          width={12}
          height={4}
          rx={0.6}
          fill={teamColor(m.color)}
          stroke="var(--gm-bg)"
          strokeWidth={0.4}
        />
      ))}
      {pick !== null && (
        <g>
          <path
            d={`M${String(edge - 7)} ${String(pick * SKY_H)}H${String(edge + 7)}`}
            stroke="var(--gm-tile-present)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle
            cx={edge}
            cy={pick * SKY_H}
            r={2.6}
            fill="var(--gm-tile-present)"
            stroke="var(--gm-accent)"
            strokeWidth={1}
          />
        </g>
      )}
    </svg>
  );
}

// ---- Lion Drum

/**
 * The lion-dance drum, seen from above: a cranberry shell with gold studs
 * and a pale head. Lit, the head turns gold and the drum jumps; dark, it's
 * frosted. A button when `onTap` is set: it fires on press, not release.
 */
export function LionDrum({
  lit,
  onTap,
  className,
  children,
}: {
  lit: boolean;
  onTap?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const studs = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  const face = (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="block size-full">
      <circle cx={50} cy={50} r={48} fill="var(--gm-accent)" />
      {studs.map((a) => (
        <circle
          key={a}
          cx={r2(50 + Math.cos(a) * 43)}
          cy={r2(50 + Math.sin(a) * 43)}
          r={2.2}
          fill="var(--gm-tile-correct)"
        />
      ))}
      <circle
        cx={50}
        cy={50}
        r={37}
        fill={lit ? "var(--gm-tile-correct)" : "var(--gm-tile-absent)"}
        stroke="var(--gm-tile-correct)"
        strokeWidth={1.5}
      />
    </svg>
  );
  const look = cx(
    "relative grid aspect-square place-items-center rounded-full",
    lit && "motion-safe:scale-[1.04]",
    "transition-transform duration-75 motion-reduce:transition-none",
    className,
  );
  const inner = (
    <>
      <span className="absolute inset-0">{face}</span>
      <span
        className={cx(
          "relative font-gm-display text-3xl font-bold",
          lit ? "text-gm-tile-correct-ink" : "text-gm-tile-absent-ink",
        )}
      >
        {children}
      </span>
    </>
  );
  if (!onTap)
    return (
      <div role="img" aria-label={lit ? "The drum: beat" : "The drum"} className={look}>
        {inner}
      </div>
    );
  return (
    <button
      type="button"
      aria-label="Tap the drum"
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) onTap();
        }
      }}
      className={cx(look, "touch-none shadow-xl select-none")}
    >
      {inner}
    </button>
  );
}

/** One pip per beat: the shown beats, then the ones to keep, filled as they pass or are tapped. */
export function BeatPips({ total, done, label }: { total: number; done: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx(
            "h-2 w-5 rounded-[2px]",
            i < done ? "bg-gm-tile-correct" : "bg-gm-tile-absent",
          )}
        />
      ))}
    </div>
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
