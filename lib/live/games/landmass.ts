import { z } from "zod";
import { rotate, seededRandom, type Cell } from "@/lib/games";
import { leadOrder } from "../fairness";
import { defineShowdown, type Role, type ShowdownGame, type TurnInfo } from "../model";

/**
 * Land Mass (spec 27, S27-AC4): teams take turns placing block pieces from a
 * shared tray onto one board, claiming squares in their color. The lead
 * moves one team on each time round. When nothing in the tray fits, it's
 * swapped once; if still nothing fits, the game ends. Most land wins.
 */
const Content = z.object({
  cols: z.number().int().min(6).max(16).default(12),
  rows: z.number().int().min(6).max(14).default(10),
  tray: z.number().int().min(2).max(6).default(4),
  turnMs: z.number().int().min(5000).max(60_000).default(30_000),
  /** Showdown points for each square a team holds at the end (Khai, 2026-11-18). */
  pointsPerSquare: z.number().int().min(1).max(50).default(5),
});

/** Turns before the game ends anyway, so it can't run on forever. */
export const MAX_TURNS = 200;

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * A piece of 4 to 6 squares, grown from one square in seeded directions, and
 * irregular (Khai, 2026-11-18): never a straight line, never a plain
 * rectangle ([row, col] cells).
 */
export function dealPiece(seed: number): Cell[] {
  const random = seededRandom(seed);
  for (;;) {
    const size = 4 + Math.floor(random() * 3);
    const cells: Cell[] = [[0, 0]];
    while (cells.length < size) {
      const [r, c] = cells[Math.floor(random() * cells.length)] ?? [0, 0];
      const [dr, dc] = DIRS[Math.floor(random() * 4)] ?? [0, 1];
      const next: Cell = [r + dr, c + dc];
      if (!cells.some((x) => x[0] === next[0] && x[1] === next[1])) cells.push(next);
    }
    const piece = rotate(cells, 0);
    if (irregular(piece)) return piece;
  }
}

/** Not a straight line and not a filled rectangle. */
export function irregular(cells: Cell[]): boolean {
  const rows = new Set(cells.map((c) => c[0])).size;
  const cols = new Set(cells.map((c) => c[1])).size;
  return rows > 1 && cols > 1 && rows * cols !== cells.length;
}

export type LandState = {
  cols: number;
  rows: number;
  /** Each square's owner, row by row (index row * cols + col), or null. */
  board: (string | null)[];
  tray: Cell[][];
  /** Pieces dealt so far, so every new piece comes from the seed in turn. */
  dealt: number;
  seed: number;
  teams: string[];
  /** Turns taken: turn n is lap floor(n / teams) in leadOrder(teams, lap). */
  turnNo: number;
  turnStartedAt: number;
  turnMs: number;
  startsAt: number;
  ended: boolean;
  swaps: number;
  history: { teamId: string; placed: boolean }[];
};

const whose = (s: LandState) => {
  const n = s.teams.length;
  const lap = Math.floor(s.turnNo / n);
  return leadOrder(s.teams, lap)[s.turnNo % n] ?? "";
};

/** The squares a piece covers placed with its top-left at row, col; null if it doesn't fit. */
export function cover(
  s: Pick<LandState, "cols" | "rows" | "board">,
  piece: Cell[],
  turns: number,
  row: number,
  col: number,
): number[] | null {
  const out: number[] = [];
  for (const [r, c] of rotate(piece, turns)) {
    const rr = row + r;
    const cc = col + c;
    if (rr < 0 || cc < 0 || rr >= s.rows || cc >= s.cols) return null;
    const i = rr * s.cols + cc;
    if (s.board[i] !== null) return null;
    out.push(i);
  }
  return out;
}

/** Every place a piece fits: anywhere inside the board on empty squares, any turn. */
export function* placements(s: Pick<LandState, "cols" | "rows" | "board">, piece: Cell[]) {
  for (let turns = 0; turns < 4; turns++)
    for (let row = 0; row < s.rows; row++)
      for (let col = 0; col < s.cols; col++)
        if (cover(s, piece, turns, row, col)) yield { turns, row, col };
}

const fitsAnywhere = (s: LandState) => s.tray.some((p) => !placements(s, p).next().done);

const deal = (s: LandState, count: number) => {
  const pieces = Array.from({ length: count }, (_, i) =>
    dealPiece((s.seed + Math.imul(s.dealt + i + 1, 0x9e3779b1)) >>> 0),
  );
  return { pieces, dealt: s.dealt + count };
};

/**
 * The next turn: if nothing in the tray fits, the tray is swapped for a fresh
 * one; if still nothing fits, the game ends (S27-AC4).
 */
function nextTurn(s: LandState, now: number, placed: boolean): LandState {
  let st: LandState = {
    ...s,
    turnNo: s.turnNo + 1,
    turnStartedAt: now,
    history: [...s.history, { teamId: whose(s), placed }],
  };
  if (st.turnNo >= MAX_TURNS) return { ...st, ended: true };
  if (!fitsAnywhere(st)) {
    const fresh = deal(st, st.tray.length);
    st = { ...st, tray: fresh.pieces, dealt: fresh.dealt, swaps: st.swaps + 1 };
    if (!fitsAnywhere(st)) st = { ...st, ended: true };
  }
  return st;
}

export const squaresOf = (s: Pick<LandState, "board">, teamId: string) =>
  s.board.filter((o) => o === teamId).length;

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: LandState, _c: unknown, { role, now }: ViewCtx) {
  const turn = !s.ended && now >= s.startsAt ? whose(s) : null;
  return {
    cols: s.cols,
    rows: s.rows,
    board: s.board,
    tray: s.tray,
    startsAt: s.startsAt,
    turn,
    turnEndsAt: s.turnStartedAt + s.turnMs,
    turnMs: s.turnMs,
    lap: Math.floor(s.turnNo / s.teams.length),
    squares: Object.fromEntries(s.teams.map((t) => [t, squaresOf(s, t)])),
    ended: s.ended,
    swaps: s.swaps,
    myTurn: role.kind !== "tv" && turn === role.teamId,
  };
}

const game: ShowdownGame<C, LandState> = {
  content: Content,
  demo: "On your turn: pick a piece, turn it, tap where it goes, then place it. Pieces go anywhere they fit. Every square you hold scores 5.",
  timeout: "Out of time? 30 seconds, or your turn passes.",
  rounds: () => 1,
  deal(c, { seed, teams, startsAt }) {
    const base: LandState = {
      cols: c.cols,
      rows: c.rows,
      board: Array.from({ length: c.cols * c.rows }, () => null),
      tray: [],
      dealt: 0,
      seed,
      teams: [...teams],
      turnNo: 0,
      turnStartedAt: startsAt,
      turnMs: c.turnMs,
      startsAt,
      ended: false,
      swaps: 0,
      history: [],
    };
    const first = deal(base, c.tray);
    return { ...base, tray: first.pieces, dealt: first.dealt };
  },
  move(s, _c, { teamId, move, now }) {
    const parsed = z
      .object({
        piece: z.number().int(),
        turns: z.number().int().min(0).max(3),
        row: z.number().int(),
        col: z.number().int(),
      })
      .safeParse(move);
    if (!parsed.success) return { ok: false, message: "Pick a piece and a place." };
    if (s.ended) return { ok: false, message: "The game is over." };
    if (now < s.startsAt) return { ok: false, message: "Not yet!" };
    if (whose(s) !== teamId) return { ok: false, message: "It isn't your turn." };
    const { piece, turns, row, col } = parsed.data;
    const cells = s.tray[piece];
    if (!cells) return { ok: false, message: "Pick a piece from the tray." };
    const squares = cover(s, cells, turns, row, col);
    if (!squares) return { ok: false, message: "It doesn't fit there." };
    const board = s.board.slice();
    for (const i of squares) board[i] = teamId;
    const fresh = deal(s, 1);
    const tray = s.tray.map((p, i) => (i === piece ? (fresh.pieces[0] ?? p) : p));
    return { ok: true, state: nextTurn({ ...s, board, tray, dealt: fresh.dealt }, now, true) };
  },
  // Out of time: the turn passes with nothing placed.
  tick(s, _c, now) {
    let st = s;
    while (!st.ended && now >= st.startsAt && now > st.turnStartedAt + st.turnMs)
      st = nextTurn(st, st.turnStartedAt + st.turnMs, false);
    return st;
  },
  over: (s) => s.ended,
  // Points for every square held (Khai, 2026-11-18).
  score: (s, c, teams) =>
    Object.fromEntries(teams.map((t) => [t, squaresOf(s, t) * c.pointsPerSquare])),
  turn: (s, _c, now): TurnInfo =>
    !s.ended && now >= s.startsAt ? { teamId: whose(s), turnNo: s.turnNo } : null,
  view,
};

export const landmass = defineShowdown(game);
export type LandView = ReturnType<typeof view>;
