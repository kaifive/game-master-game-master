import { z } from "zod";
import { seededRandom } from "@/lib/games";
import { lapRounds, leadOrder } from "../fairness";
import { defineShowdown, type Role, type ShowdownGame, type TurnInfo } from "../model";
import { roundShare } from "./scoring";

/**
 * Memory Path (spec 27, S27-AC1): a path lights up on the TV and hides;
 * teams take turns crossing it from memory. A wrong square or a slow step
 * knocks a team out; the squares it got right stay lit for the teams after.
 * Crossing scores most, getting part way less, and every team something.
 */
/**
 * Each round is harder than the last (Khai, 2026-11-18): a longer path and
 * less time to learn it. Round n uses level n, the last level repeating.
 */
const Level = z
  .object({
    minLength: z.number().int().min(4).max(40),
    maxLength: z.number().int().min(4).max(40),
    showMs: z.number().int().min(2000).max(20_000),
  })
  .refine((l) => l.minLength <= l.maxLength, "minLength must not be above maxLength");

export const PATH_LEVELS = [
  { minLength: 10, maxLength: 12, showMs: 7000 },
  { minLength: 12, maxLength: 14, showMs: 6500 },
  { minLength: 14, maxLength: 16, showMs: 6000 },
  { minLength: 15, maxLength: 17, showMs: 5500 },
  { minLength: 17, maxLength: 19, showMs: 5000 },
  { minLength: 18, maxLength: 20, showMs: 4500 },
];

const Content = z
  .object({
    cols: z.number().int().min(3).max(8).default(5),
    rows: z.number().int().min(4).max(12).default(9),
    levels: z.array(Level).min(1).max(10).default(PATH_LEVELS),
    stepMs: z.number().int().min(2000).max(20_000).default(5000),
    /** A crossing's points; left out, the round's share of 150 (ADR-045). */
    points: z.number().int().min(1).max(500).optional(),
  })
  .refine(
    (c) => c.levels.every((l) => l.minLength >= c.rows),
    "a path crosses every row, so every minLength must be at least rows",
  );

/** The level for a round: harder each round, the last one repeating. */
export const levelFor = (levels: readonly z.infer<typeof Level>[], round: number) =>
  levels[Math.min(round, levels.length) - 1] ?? levels[0] ?? PATH_LEVELS[0];

export type Square = [number, number]; // [col, row], row 0 at the top

/**
 * A path from the seed: starts on the bottom row, moves one square up, left
 * or right at a time, never onto a square it's been, and ends on the top row,
 * with a length in range (S27-AC1).
 */
export function dealPath(
  seed: number,
  c: { cols: number; rows: number; minLength: number; maxLength: number },
): Square[] {
  const random = seededRandom(seed);
  let best: Square[] = [];
  for (let attempt = 0; attempt < 400; attempt++) {
    const path: Square[] = [[Math.floor(random() * c.cols), c.rows - 1]];
    const seen = new Set([String(path[0])]);
    let lastSide = 0;
    while ((path[path.length - 1]?.[1] ?? 0) > 0) {
      const [col, row] = path[path.length - 1] ?? [0, 0];
      // A step may not touch any earlier square but the one it came from, so the
      // path is one clean line with no blocks or forks to puzzle over.
      const touches = (x: number, y: number) =>
        path.slice(0, -1).some(([px, py]) => Math.abs(px - x) + Math.abs(py - y) === 1);
      const sides = [-1, 1].filter(
        (d) =>
          d !== -lastSide &&
          col + d >= 0 &&
          col + d < c.cols &&
          !seen.has(String([col + d, row])) &&
          !touches(col + d, row),
      );
      // Sideways now and then, to wind the path; never so often it can't fit the length.
      const roomLeft = c.maxLength - path.length - row;
      const side =
        sides.length > 0 && roomLeft > 0 && random() < 0.42
          ? sides[Math.floor(random() * sides.length)]
          : undefined;
      // Going up onto a square beside an earlier one would fork too: go up only where it's clear.
      const next: Square = side !== undefined ? [col + side, row] : [col, row - 1];
      lastSide = side ?? 0;
      path.push(next);
      seen.add(String(next));
    }
    if (path.length >= c.minLength && path.length <= c.maxLength) return path;
    if (
      Math.abs(path.length - c.minLength) < Math.abs(best.length - c.minLength) ||
      best.length === 0
    )
      best = path;
  }
  return best;
}

export type PathState = {
  path: Square[];
  cols: number;
  rows: number;
  order: string[];
  startsAt: number;
  showEndsAt: number;
  stepMs: number;
  /** Which team in `order` is crossing; order.length once everyone has gone. */
  at: number;
  /** Squares the crossing team has got right, counting the start square it's given. */
  progress: number;
  stepEndsAt: number;
  /** The most squares any team got right before going out: lit for the rest. */
  lit: number;
  results: Record<string, { reached: number; crossed: boolean }>;
  lastMiss: { teamId: string; square: Square } | null;
  winner: string | null;
};

const crossing = (s: PathState) => (s.winner === null ? (s.order[s.at] ?? null) : null);

/**
 * Each team starts on the path's first square, given (so the phone only needs
 * arrows, Khai 2026-11-24), and steps up, left or right from there.
 */
export const START = 1;

/** Where a step from the crossing team's square lands: up, left or right. */
export function stepFrom(square: Square, dir: "up" | "left" | "right"): Square {
  const [col, row] = square;
  return dir === "up" ? [col, row - 1] : dir === "left" ? [col - 1, row] : [col + 1, row];
}

/** The crossing team goes out (wrong or slow); the next team starts from the bottom. */
function out(s: PathState, now: number, miss: Square | null): PathState {
  const teamId = s.order[s.at] ?? "";
  return {
    ...s,
    results: { ...s.results, [teamId]: { reached: s.progress, crossed: false } },
    lit: Math.max(s.lit, s.progress),
    lastMiss: miss ? { teamId, square: miss } : null,
    at: s.at + 1,
    progress: START,
    stepEndsAt: now + s.stepMs,
  };
}

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: PathState, _c: unknown, { role, revealed, now }: ViewCtx) {
  const showing = now < s.showEndsAt;
  // While it shows, only the TV gets the path, a square at a time as it lights up.
  const shown = revealed
    ? s.path
    : showing
      ? role.kind === "tv" && now >= s.startsAt
        ? s.path.slice(
            0,
            Math.min(
              s.path.length,
              Math.floor(((now - s.startsAt) / (s.showEndsAt - s.startsAt)) * s.path.length) + 1,
            ),
          )
        : []
      : [];
  const team = crossing(s);
  return {
    cols: s.cols,
    rows: s.rows,
    length: s.path.length,
    order: s.order,
    startsAt: s.startsAt,
    showEndsAt: s.showEndsAt,
    shown,
    /** Squares earlier teams got right: lit for everyone. */
    lit: s.path.slice(0, s.lit),
    /** The squares the crossing team has got right so far. */
    progress: s.path.slice(0, s.progress),
    crossing: now >= s.showEndsAt ? team : null,
    stepEndsAt: s.stepEndsAt,
    stepMs: s.stepMs,
    results: s.results,
    lastMiss: s.lastMiss,
    winner: s.winner,
    myTurn: role.kind !== "tv" && now >= s.showEndsAt && team === role.teamId,
  };
}

const game: ShowdownGame<C, PathState> = {
  content: Content,
  demo: "Remember the path, then cross it!",
  timeout: "Out of time? 5 seconds a step, or you're out.",
  rounds: (_c, teams) => lapRounds(teams),
  deal: (c, { seed, round, teams, startsAt }) => {
    const level = levelFor(c.levels, round) ?? { minLength: 12, maxLength: 16, showMs: 6000 };
    return {
      path: dealPath(seed, { cols: c.cols, rows: c.rows, ...level }),
      cols: c.cols,
      rows: c.rows,
      // Who crosses first rotates so every team goes first once (S24-AC6).
      order: leadOrder(teams, round - 1),
      startsAt,
      showEndsAt: startsAt + level.showMs,
      stepMs: c.stepMs,
      at: 0,
      progress: START,
      stepEndsAt: startsAt + level.showMs + c.stepMs,
      lit: 0,
      results: {},
      lastMiss: null,
      winner: null,
    };
  },
  move(s, _c, { teamId, move, now }) {
    const parsed = z
      .union([
        z.object({ dir: z.enum(["up", "left", "right"]) }),
        z.object({ square: z.tuple([z.number().int(), z.number().int()]) }),
      ])
      .safeParse(move);
    if (!parsed.success) return { ok: false, message: "Pick a way to go." };
    if (now < s.showEndsAt) return { ok: false, message: "Watch the path first!" };
    if (crossing(s) !== teamId) return { ok: false, message: "It isn't your turn." };
    const here = s.path[s.progress - 1] ?? s.path[0] ?? [0, 0];
    const [col, row] = "dir" in parsed.data ? stepFrom(here, parsed.data.dir) : parsed.data.square;
    const want = s.path[s.progress];
    if (!want || want[0] !== col || want[1] !== row)
      return { ok: true, state: out(s, now, [col, row]) };
    const progress = s.progress + 1;
    if (progress === s.path.length)
      return {
        ok: true,
        state: {
          ...s,
          progress,
          winner: teamId,
          results: { ...s.results, [teamId]: { reached: progress, crossed: true } },
        },
      };
    return { ok: true, state: { ...s, progress, stepEndsAt: now + s.stepMs, lastMiss: null } };
  },
  // Too slow on a step is out, like a wrong one (A38).
  tick(s, _c, now) {
    let st = s;
    while (crossing(st) !== null && now >= st.showEndsAt && now > st.stepEndsAt)
      st = out(st, st.stepEndsAt, null);
    return st;
  },
  over: (s) => s.winner !== null || s.at >= s.order.length,
  // Crossing scores the round's share; some right squares 80% of it; none 50% (Khai, 2026-11-24).
  score: (s, c, teams) => {
    const full = c.points ?? roundShare(lapRounds(teams.length));
    return Object.fromEntries(
      teams.map((t) => {
        const r = s.results[t];
        const share = t === s.winner ? 1 : r && r.reached > START ? 0.8 : 0.5;
        return [t, Math.round(full * share)];
      }),
    );
  },
  turn: (s, _c, now): TurnInfo => {
    const team = crossing(s);
    return team && now >= s.showEndsAt ? { teamId: team, turnNo: s.at } : null;
  },
  view,
};

export const path = defineShowdown(game);
export type PathView = ReturnType<typeof view>;
